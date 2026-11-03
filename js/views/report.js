import * as store from '../store.js';
import { avg, chartSvg, marksCard, sleepRhythmSvg } from './charts.js';
import { findPatterns } from './patterns.js';
import { buildPsychReport } from './report-psych.js';
import { esc, fmtNum, fmtSleep, icon, METRICS, plural } from '../ui.js';

const PRESETS = [14, 30, 90];
const opts = { days: 30, from: null, to: null, texts: false, sleepLow: 7, sleepHigh: 9 };

const MEDS_SHORT = { taken: '✓', missed: 'пропуск', none: '—' };

export function render(root) {
  const today = store.dateKey();
  if (!opts.to) opts.to = today;
  if (!opts.from) opts.from = store.addDays(today, -(opts.days - 1));
  const advanced = store.advancedReportOn();

  root.innerHTML = `
    <div class="no-print">
      <div class="detail-head">
        <a class="icon-btn" href="#/charts" aria-label="Назад">${icon('back')}</a>
      </div>
      <header class="page-head"><span class="hand">для приёма</span><h1 class="display">${advanced ? 'Расширенный отчёт для врача' : 'Отчёт для психолога'}</h1></header>
      <section class="card report-controls">
        <div class="seg" role="group" aria-label="Период">
          ${PRESETS.map((d) => `<button data-d="${d}" aria-pressed="${opts.days === d}">${d} дней</button>`).join('')}
        </div>
        <div class="row">
          <label class="field" style="flex:1"><span class="label">С</span><input class="input" type="date" data-k="from" value="${opts.from}" max="${today}"></label>
          <label class="field" style="flex:1"><span class="label">По</span><input class="input" type="date" data-k="to" value="${opts.to}" max="${today}"></label>
        </div>
        ${advanced ? `
        <div class="row report-thresholds">
          <label class="field" style="flex:1"><span class="label">Короткий сон, менее (ч)</span><input class="input" type="number" min="0" max="15.5" step="0.5" data-k="sleepLow" value="${opts.sleepLow}"></label>
          <label class="field" style="flex:1"><span class="label">Долгий сон, более (ч)</span><input class="input" type="number" min="0.5" max="16" step="0.5" data-k="sleepHigh" value="${opts.sleepHigh}"></label>
        </div>
        <p class="note">Ориентиры для выделения дней, а не медицинская норма. По умолчанию: менее 7 и более 9 ч.</p>
        ` : ''}
        <label class="check"><input type="checkbox" data-k="texts" ${opts.texts ? 'checked' : ''}> Включить тексты дневника</label>
        <button class="btn primary wide" data-act="print">${icon('print')} Сохранить PDF / распечатать</button>
        <p class="note" style="margin:0">В окне печати выбери «Сохранить как PDF» — файл можно отправить психологу или другому специалисту либо показать на приёме.</p>
      </section>
    </div>
    <article class="report"></article>
  `;

  const out = root.querySelector('.report');
  const draw = () => { out.innerHTML = advanced
    ? build(opts.from, opts.to, opts.texts, opts.sleepLow, opts.sleepHigh)
    : buildPsychReport(opts.from, opts.to, opts.texts); };

  for (const b of root.querySelectorAll('[data-d]')) {
    b.onclick = () => {
      opts.days = Number(b.dataset.d);
      opts.to = today;
      opts.from = store.addDays(today, -(opts.days - 1));
      root.querySelector('[data-k="from"]').value = opts.from;
      root.querySelector('[data-k="to"]').value = opts.to;
      root.querySelectorAll('[data-d]').forEach((x) => x.setAttribute('aria-pressed', x === b));
      draw();
    };
  }
  for (const inp of root.querySelectorAll('input[type="date"]')) {
    inp.onchange = () => {
      if (!store.isDateKey(inp.value)) return;
      opts[inp.dataset.k] = inp.value;
      if (opts.from > opts.to) [opts.from, opts.to] = [opts.to, opts.from];
      opts.days = null;
      root.querySelector('[data-k="from"]').value = opts.from;
      root.querySelector('[data-k="to"]').value = opts.to;
      root.querySelectorAll('[data-d]').forEach((x) => x.setAttribute('aria-pressed', 'false'));
      draw();
    };
  }
  for (const inp of root.querySelectorAll('.report-thresholds input')) {
    inp.onchange = () => {
      const low = Number(root.querySelector('[data-k="sleepLow"]').value);
      const high = Number(root.querySelector('[data-k="sleepHigh"]').value);
      if (!Number.isFinite(low) || !Number.isFinite(high) || low < 0 || high > 16 || low >= high) {
        root.querySelector('[data-k="sleepLow"]').value = opts.sleepLow;
        root.querySelector('[data-k="sleepHigh"]').value = opts.sleepHigh;
        return;
      }
      opts.sleepLow = low;
      opts.sleepHigh = high;
      draw();
    };
  }
  root.querySelector('[data-k="texts"]').onchange = (ev) => { opts.texts = ev.target.checked; draw(); };
  root.querySelector('[data-act="print"]').onclick = () => window.print();

  draw();
}

function build(from, to, withTexts, sleepLow, sleepHigh) {
  const n = store.daysBetween(from, to) + 1;
  const days = Array.from({ length: n }, (_, k) => store.addDays(from, k));
  const entries = days.map((d) => store.getEntry(d) || { date: d });
  const filled = entries.filter((e) => store.getEntry(e.date) != null);
  const filledDates = new Set(filled.map((e) => e.date));
  const name = store.settings().name;
  const fmt = (k, o) => store.parseKey(k).toLocaleDateString('ru-RU', o);

  const kpi = (key) => {
    const vals = entries.map((e) => e[key]).filter((v) => typeof v === 'number');
    if (!vals.length) return '';
    const a = avg(entries, key);
    const unit = key === 'sleep' ? ' ч' : '';
    const format = (v) => key === 'sleep' ? fmtSleep(v) : fmtNum(Math.round(v * 10) / 10);
    return `<div class="kpi"><span>${METRICS[key].label}, среднее</span><b>${format(a)}${unit}</b><span>от ${format(Math.min(...vals))} до ${format(Math.max(...vals))}${unit} · ${vals.length} дн.</span></div>`;
  };

  const meds = { taken: 0, missed: 0, none: 0 };
  for (const e of entries) if (e.meds) meds[e.meds]++;
  const cycleOn = store.cycleOn();
  const cycles = entries.filter((e) => cycleOn && e.periodStart).map((e) => fmt(e.date, { day: 'numeric', month: 'long' }));

  const emoCount = {};
  for (const e of entries) for (const m of e.emotions || []) emoCount[m] = (emoCount[m] || 0) + 1;
  const topEmo = Object.entries(emoCount).sort((a, b) => b[1] - a[1]).slice(0, 8);

  // Отклонения — это правила просмотра дневника, не диагноз.
  const shortSleep = entries.filter((e) => typeof e.sleep === 'number' && e.sleep < sleepLow);
  const longSleep = entries.filter((e) => typeof e.sleep === 'number' && e.sleep > sleepHigh);
  const combo = entries.filter((e) => typeof e.sleep === 'number' && e.sleep < sleepLow && e.energy >= 9);
  const longestRun = (predicate) => {
    let longest = 0, current = 0;
    for (const e of entries) {
      current = predicate(e) ? current + 1 : 0;
      longest = Math.max(longest, current);
    }
    return longest;
  };
  const reasons = (e) => {
    const out = [];
    if (typeof e.sleep === 'number') {
      if (e.sleep < sleepLow) out.push('сон ' + fmtSleep(e.sleep) + ' ч (менее ' + fmtSleep(sleepLow) + ' ч)');
      if (e.sleep > sleepHigh) out.push('сон ' + fmtSleep(e.sleep) + ' ч (более ' + fmtSleep(sleepHigh) + ' ч)');
    }
    if (typeof e.state === 'number' && e.state <= 3) out.push('состояние ' + e.state + '/10');
    if (typeof e.anxiety === 'number' && e.anxiety >= 8) out.push('тревога ' + e.anxiety + '/10');
    if (typeof e.irritability === 'number' && e.irritability >= 8) out.push('раздражительность ' + e.irritability + '/10');
    if (typeof e.sleep === 'number' && e.sleep < sleepLow && typeof e.energy === 'number' && e.energy >= 9) out.push('при коротком сне энергия ' + e.energy + '/10');
    if (store.medsOn() && e.meds === 'missed') out.push('отмечен пропуск лекарства');
    return out;
  };
  const flagged = filled.map((e) => ({ date: e.date, reasons: reasons(e) })).filter((e) => e.reasons.length);
  const flaggedDates = new Set(flagged.map((e) => e.date));
  const patterns = findPatterns(entries, sleepLow, sleepHigh);
  const clockEntries = entries.filter((e) => e.sleepStart && e.sleepEnd);

  const observations = [];
  if (shortSleep.length) observations.push('Сон менее ' + fmtSleep(sleepLow) + ' ч: ' + shortSleep.length + ' дн.; самая длинная последовательность — ' + longestRun((e) => typeof e.sleep === 'number' && e.sleep < sleepLow) + ' дн.');
  if (longSleep.length) observations.push('Сон более ' + fmtSleep(sleepHigh) + ' ч: ' + longSleep.length + ' дн.');
  if (combo.length) observations.push('Короткий сон одновременно с энергией 9–10/10: ' + combo.length + ' дн. — сочетание для обсуждения с врачом.');
  if (store.medsOn() && meds.missed) observations.push('Отмечены пропуски приёма лекарств: ' + meds.missed + '.');
  if (!observations.length) observations.push('По выбранным правилам отклонений среди имеющихся измерений не выявлено.');

  const cell = (e, k) => {
    const v = e[k];
    if (typeof v !== 'number') return '<td class="num">—</td>';
    let cls = '';
    if (k === 'sleep' && (v < sleepLow || v > sleepHigh)) cls = 'flag-low';
    if (k === 'state' && v <= 3) cls = 'flag-low';
    if (k === 'energy' && v >= 9 && typeof e.sleep === 'number' && e.sleep < sleepLow) cls = 'flag-high';
    if ((k === 'anxiety' || k === 'irritability') && v >= 8) cls = 'flag-low';
    return '<td class="num ' + cls + '">' + (k === 'sleep' ? fmtSleep(v) : fmtNum(v)) + '</td>';
  };

  const legend = (keys) => `<div class="legend">${keys.map((k) => `<span><i style="background:${METRICS[k].color}"></i>${METRICS[k].label}</span>`).join('')}</div>`;

  return `
    <header>
      <h1>Дневник состояния${name ? ` — ${esc(name)}` : ''}</h1>
      <p class="sub">Период: ${fmt(from, { day: 'numeric', month: 'long' })} — ${fmt(to, { day: 'numeric', month: 'long', year: 'numeric' })} (${n} ${plural(n, ['день', 'дня', 'дней'])}).
      Отмечено дней: ${filled.length} из ${n}. Сформирован ${new Date().toLocaleDateString('ru-RU')}.</p>
    </header>

    <section>
      <h2>Сводка</h2>
      <div class="kpis">
        ${['sleep', 'state', 'energy', 'anxiety', 'irritability'].map(kpi).join('')}
        <div class="kpi"><span>Заполнено дней</span><b>${filled.length} / ${n}</b><span>Дни без записи не считаются пропуском лекарства</span></div>
        <div class="kpi"><span>Сон вне ориентиров</span><b>${shortSleep.length + longSleep.length}</b><span>короткий: ${shortSleep.length}, долгий: ${longSleep.length}</span></div>
        ${store.medsOn() ? `<div class="kpi"><span>Лекарства</span><b>${meds.taken} / ${meds.taken + meds.missed}</b><span>принято среди известных отметок; пропусков: ${meds.missed}</span></div>` : ''}
      </div>
      <p class="sub" style="margin-top:10px">Шкалы 1–10 (самооценка). Сон — часы за ночь${cycles.length ? `. Начало цикла: ${cycles.join(', ')}` : ''}.</p>
    </section>

    <section class="report-overview">
      <h2>Ключевые наблюдения за весь период</h2>
      <ul>${observations.map((item) => `<li>${esc(item)}</li>`).join('')}</ul>
      <p class="sub">Автоматические отметки основаны на заданных порогах. Они не устанавливают диагноз и не заменяют оценку специалиста.</p>
    </section>

    <section class="report-patterns">
      <h2>Повторяющиеся изменения — обсудить на приёме</h2>
      <p class="sub">Отдельные наблюдения основаны на последовательных заполненных днях. Пробелы в дневнике прерывают последовательности, а не заполняются предположениями.</p>
      ${patterns.length ? `<div class="pattern-list">${patterns.map((p) => `
        <div class="pattern-item">
          <b>${esc(p.title)}</b>
          <p>${fmt(p.from, {day:'numeric', month:'short'})} — ${fmt(p.to, {day:'numeric', month:'short'})} · ${p.days} дн. подряд</p>
          <p>${p.id === 'short' || p.id === 'long' || p.id === 'combo' ? 'Сон: ' + fmtSleep(p.min) + '–' + fmtSleep(p.max) + ' ч' : 'Оценки: ' + p.min + '–' + p.max + '/10'}${p.id === 'combo' ? '; энергия 9–10/10' : ''}</p>
          ${p.events.length ? `<p>Отмеченные события: ${esc(p.events.join(', '))}</p>` : ''}
        </div>`).join('')}</div>` : '<p class="sub">Продолжительных повторяющихся изменений по выбранным правилам не обнаружено.</p>'}
      <p class="sub">Это поводы для обсуждения, а не признаки конкретного диагноза.</p>
    </section>
    <section>
      <h2>Состояние и энергия</h2>
      ${legend(['state', 'energy'])}
      <div class="chart">${chartSvg(entries, ['state', 'energy'], 'line')}</div>
    </section>
    <section>
      <h2>Сон: продолжительность по дням</h2>
      <p class="sub">Выделен диапазон ${fmtSleep(sleepLow)}–${fmtSleep(sleepHigh)} ч. Сплошная линия — соседние измерения, пунктир — пропущенные даты. Красные точки — вне диапазона.</p>
      <div class="chart">${chartSvg(entries, ['sleep'], 'line', { sleepLow, sleepHigh })}</div>
    </section>
    ${clockEntries.length ? `<section>
      <h2>Режим сна по ночам</h2>
      <p class="sub">Время засыпания и пробуждения, по тем дням, когда указаны оба значения. График показывает не более 31 последнего дня периода.</p>
      <div class="chart sleep-rhythm">${sleepRhythmSvg(entries)}</div>
    </section>` : ''}
    <section>
      <h2>Тревога и раздражительность</h2>
      ${legend(['anxiety', 'irritability'])}
      <div class="chart">${chartSvg(entries, ['anxiety', 'irritability'], 'line')}</div>
    </section>
    <section class="report-marks">${marksCard(entries)}</section>

    <section>
      <h2>Даты и значения, на которые стоит обратить внимание</h2>
      <p class="sub">Сон вне выбранного диапазона; состояние ≤3/10; тревога или раздражительность ≥8/10; короткий сон при энергии ≥9/10${store.medsOn() ? '; отмеченные пропуски лекарств' : ''}.</p>
      ${flagged.length ? `<ul class="report-alerts">
        ${flagged.map(({ date, reasons: notes }) => `<li><b>${fmt(date, { day: 'numeric', month: 'short' })}</b><span>${esc(notes.join('; '))}</span></li>`).join('')}
      </ul>` : '<p>Таких отметок в заполненных данных нет.</p>'}
    </section>

    ${topEmo.length ? `<section>
      <h2>Частые чувства</h2>
      <p>${topEmo.map(([m, c]) => `${esc(m)} — ${c} ${plural(c, ['день', 'дня', 'дней'])}`).join('; ')}</p>
    </section>` : ''}

    <section>
      <h2>По дням</h2>
      <div class="table-wrap"><table>
        <thead><tr><th>Дата</th><th class="num">Сон</th><th class="num">Сост.</th><th class="num">Энерг.</th><th class="num">Трев.</th><th class="num">Раздр.</th>${store.medsOn() ? '<th>Лек.</th>' : ''}<th>Заметки</th></tr></thead>
        <tbody>
          ${entries.map((e) => `<tr class="${!filledDates.has(e.date) ? 'report-empty' : flaggedDates.has(e.date) ? 'report-highlight' : ''}">
            <td>${fmt(e.date, { day: '2-digit', month: '2-digit' })}${cycleOn && e.periodStart ? ' ●' : ''}</td>
            ${['sleep', 'state', 'energy', 'anxiety', 'irritability'].map((k) => cell(e, k)).join('')}
            ${store.medsOn() ? `<td>${e.meds ? MEDS_SHORT[e.meds] : '—'}</td>` : ''}
            <td class="note-cell">${!filledDates.has(e.date) ? 'Нет записи' : (esc([...(e.emotions || []), ...(e.triggers || [])].join(', ')) + (withTexts && e.text ? (e.emotions?.length || e.triggers?.length ? '; ' : '') + esc(e.text) : '')) || '—'}</td>
          </tr>`).join('')}
        </tbody>
      </table></div>
      <p class="sub">— означает, что показатель не указан. Серым выделены дни без записи. Отклонения выделяются жирным.</p>
      ${cycleOn ? '<p class="sub">● — первый день цикла.</p>' : ''}
    </section>

    <p class="footer">Данные самонаблюдения пациента из приложения «Баланс». Не являются медицинским заключением.</p>
  `;
}
