import * as store from '../store.js';
import { avg, chartSvg, insights, marksCard } from './charts.js';
import { esc, fmtNum, icon, METRICS, plural } from '../ui.js';

const PRESETS = [14, 30, 90];
const opts = { days: 30, from: null, to: null, texts: false };

const MEDS_SHORT = { taken: '✓', missed: 'пропуск', none: '—' };

export function render(root) {
  const today = store.dateKey();
  if (!opts.to) opts.to = today;
  if (!opts.from) opts.from = store.addDays(today, -(opts.days - 1));

  root.innerHTML = `
    <div class="no-print">
      <div class="detail-head">
        <a class="icon-btn" href="#/charts" aria-label="Назад">${icon('back')}</a>
      </div>
      <header class="page-head"><span class="hand">для приёма</span><h1 class="display">Отчёт для врача</h1></header>
      <section class="card report-controls">
        <div class="seg" role="group" aria-label="Период">
          ${PRESETS.map((d) => `<button data-d="${d}" aria-pressed="${opts.days === d}">${d} дней</button>`).join('')}
        </div>
        <div class="row">
          <label class="field" style="flex:1"><span class="label">С</span><input class="input" type="date" data-k="from" value="${opts.from}" max="${today}"></label>
          <label class="field" style="flex:1"><span class="label">По</span><input class="input" type="date" data-k="to" value="${opts.to}" max="${today}"></label>
        </div>
        <label class="check"><input type="checkbox" data-k="texts" ${opts.texts ? 'checked' : ''}> Включить тексты дневника</label>
        <button class="btn primary wide" data-act="print">${icon('print')} Сохранить PDF / распечатать</button>
        <p class="note" style="margin:0">В окне печати выбери «Сохранить как PDF» — файл можно отправить врачу или показать на приёме.</p>
      </section>
    </div>
    <article class="report"></article>
  `;

  const out = root.querySelector('.report');
  const draw = () => { out.innerHTML = build(opts.from, opts.to, opts.texts); };

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
      root.querySelectorAll('[data-d]').forEach((x) => x.setAttribute('aria-pressed', 'false'));
      draw();
    };
  }
  root.querySelector('[data-k="texts"]').onchange = (ev) => { opts.texts = ev.target.checked; draw(); };
  root.querySelector('[data-act="print"]').onclick = () => window.print();

  draw();
}

function build(from, to, withTexts) {
  const n = store.daysBetween(from, to) + 1;
  const days = Array.from({ length: n }, (_, k) => store.addDays(from, k));
  const entries = days.map((d) => store.getEntry(d) || { date: d });
  const filled = entries.filter((e) => e.createdAt);
  const name = store.settings().name;
  const fmt = (k, o) => store.parseKey(k).toLocaleDateString('ru-RU', o);

  const kpi = (key) => {
    const vals = entries.map((e) => e[key]).filter((v) => typeof v === 'number');
    if (!vals.length) return '';
    const a = avg(entries, key);
    const unit = key === 'sleep' ? ' ч' : '';
    return `<div class="kpi"><span>${METRICS[key].label}, среднее</span><b>${fmtNum(Math.round(a * 10) / 10)}${unit}</b><span>от ${fmtNum(Math.min(...vals))} до ${fmtNum(Math.max(...vals))}${unit}</span></div>`;
  };

  const meds = { taken: 0, missed: 0, none: 0 };
  for (const e of entries) if (e.meds) meds[e.meds]++;
  const cycleOn = store.cycleOn();
  const cycles = entries.filter((e) => cycleOn && e.periodStart).map((e) => fmt(e.date, { day: 'numeric', month: 'long' }));

  const emoCount = {};
  for (const e of entries) for (const m of e.emotions || []) emoCount[m] = (emoCount[m] || 0) + 1;
  const topEmo = Object.entries(emoCount).sort((a, b) => b[1] - a[1]).slice(0, 8);

  // дни, на которые стоит обратить внимание
  const flagged = filled.filter((e) =>
    (typeof e.sleep === 'number' && (e.sleep <= 5 || e.sleep >= 11)) ||
    (typeof e.state === 'number' && (e.state <= 3 || e.state >= 9)) ||
    (typeof e.energy === 'number' && e.energy >= 9) ||
    e.meds === 'missed');

  const cell = (e, k) => {
    const v = e[k];
    if (typeof v !== 'number') return '<td class="num">—</td>';
    let cls = '';
    if (k === 'sleep' && (v <= 5 || v >= 11)) cls = 'flag-low';
    if (k === 'state' && v <= 3) cls = 'flag-low';
    if ((k === 'state' || k === 'energy') && v >= 9) cls = 'flag-high';
    if ((k === 'anxiety' || k === 'irritability') && v >= 8) cls = 'flag-low';
    return `<td class="num ${cls}">${fmtNum(v)}</td>`;
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
        <div class="kpi"><span>Лекарства</span><b>${meds.taken} / ${meds.taken + meds.missed}</b><span>принято; пропусков: ${meds.missed}</span></div>
      </div>
      <p class="sub" style="margin-top:10px">Шкалы 1–10 (самооценка). Сон — часы за ночь${cycles.length ? `. Начало цикла: ${cycles.join(', ')}` : ''}.</p>
    </section>

    <section>
      <h2>Состояние и энергия</h2>
      ${legend(['state', 'energy'])}
      <div class="chart">${chartSvg(entries, ['state', 'energy'], 'line')}</div>
    </section>
    <section>
      <h2>Сон</h2>
      <div class="chart">${chartSvg(entries, ['sleep'], 'bar')}</div>
    </section>
    <section>
      <h2>Тревога и раздражительность</h2>
      ${legend(['anxiety', 'irritability'])}
      <div class="chart">${chartSvg(entries, ['anxiety', 'irritability'], 'line')}</div>
    </section>
    <section class="report-marks">${marksCard(entries)}</section>

    <section>
      <h2>Наблюдения за последние 2 недели периода</h2>
      <div class="insights">${insights(to, true)}</div>
    </section>

    ${flagged.length ? `<section>
      <h2>Дни, на которые стоит обратить внимание</h2>
      <p class="sub" style="margin:-4px 0 8px">Сон ≤ 5 или ≥ 11 ч, состояние ≤ 3 или ≥ 9, энергия ≥ 9, пропуск лекарств.</p>
      <p>${flagged.map((e) => fmt(e.date, { day: 'numeric', month: 'short' })).join(', ')}</p>
    </section>` : ''}

    ${topEmo.length ? `<section>
      <h2>Частые чувства</h2>
      <p>${topEmo.map(([m, c]) => `${esc(m)} — ${c} ${plural(c, ['день', 'дня', 'дней'])}`).join('; ')}</p>
    </section>` : ''}

    <section>
      <h2>По дням</h2>
      <div class="table-wrap"><table>
        <thead><tr><th>Дата</th><th class="num">Сон</th><th class="num">Сост.</th><th class="num">Энерг.</th><th class="num">Трев.</th><th class="num">Раздр.</th><th>Лек.</th><th>Заметки</th></tr></thead>
        <tbody>
          ${filled.map((e) => `<tr>
            <td>${fmt(e.date, { day: '2-digit', month: '2-digit' })}${cycleOn && e.periodStart ? ' ●' : ''}</td>
            ${['sleep', 'state', 'energy', 'anxiety', 'irritability'].map((k) => cell(e, k)).join('')}
            <td>${e.meds ? MEDS_SHORT[e.meds] : '—'}</td>
            <td class="note-cell">${esc((e.emotions || []).join(', '))}${withTexts && e.text ? `${e.emotions?.length ? '<br>' : ''}${esc(e.text)}` : ''}</td>
          </tr>`).join('')}
        </tbody>
      </table></div>
      ${cycleOn ? '<p class="sub">● — первый день цикла.</p>' : ''}
    </section>

    <p class="footer">Данные самонаблюдения пациента из приложения «Баланс». Не являются медицинским заключением.</p>
  `;
}
