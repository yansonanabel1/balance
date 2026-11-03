import * as store from '../store.js';
import { art } from '../art.js';
import { fmtNum, fmtSleep, icon, METRICS } from '../ui.js';

const RANGES = [7, 30, 90];
let range = 30;

const W = 320, H = 150, PL = 22, PR = 6, PT = 8, PB = 20;

export function render(root) {
  if (!store.hasEntries()) {
    root.innerHTML = `
      <header class="page-head"><h1 class="display">Графики</h1></header>
      <div class="empty-state">
        ${art('path')}
        <h2 class="h2">Пока нет данных</h2>
        <p>После нескольких утренних отметок здесь появятся графики сна, состояния и энергии.</p>
        <a class="btn primary" href="#/checkin/${store.dateKey()}">Сделать отметку</a>
      </div>`;
    return;
  }

  root.innerHTML = `
    <header class="page-head"><p class="eyebrow">Как менялось состояние</p><h1 class="display">Графики</h1>
      <a class="btn sm ink" style="margin-top:14px" href="#/report">${icon('print')} ${store.advancedReportOn() ? 'Отчёт для врача' : 'Отчёт для психолога'}</a></header>
    <section>
      <div class="section-title"><h2 class="h2">Наблюдения</h2><span class="hand">за 2 недели</span></div>
      <div class="insights">${insights(store.dateKey())}</div>
    </section>
    <section class="section">
      <div class="seg" role="group" aria-label="Период">
        ${RANGES.map((r) => `<button data-r="${r}" aria-pressed="${r === range}">${r} дней</button>`).join('')}
      </div>
      <div class="charts"></div>
    </section>`;

  const holder = root.querySelector('.charts');
  const draw = () => {
    const days = [];
    const today = store.dateKey();
    for (let k = range - 1; k >= 0; k--) days.push(store.addDays(today, -k));
    const entries = days.map((d) => store.getEntry(d) || { date: d });

    holder.innerHTML = [
      card('Состояние и энергия', entries, ['state', 'energy'], 'line'),
      card('Сон', entries, ['sleep'], 'line'),
      ...(entries.some((e) => e.sleepStart && e.sleepEnd) ? ['<section class="card chart-card"><h2 class="h2">Режим сна по ночам</h2><p class="muted">Время засыпания и пробуждения, если они указаны</p><div class="chart sleep-rhythm">' + sleepRhythmSvg(entries) + '</div></section>'] : []),
      card('Тревога и раздражительность', entries, ['anxiety', 'irritability'], 'line'),
      marksCard(entries),
    ].join('');
  };

  for (const b of root.querySelectorAll('.seg button')) {
    b.onclick = () => {
      range = Number(b.dataset.r);
      root.querySelectorAll('.seg button').forEach((x) => x.setAttribute('aria-pressed', x === b));
      draw();
    };
  }
  draw();
}

// Простые наблюдения без AI: сравниваем последние дни с привычным уровнем.
// forDoctor — нейтральные формулировки для отчёта врачу
export function insights(today, forDoctor = false) {
  const say = (mine, doc) => (forDoctor ? doc : mine);
  const vals = (key, from, to) => {
    const out = [];
    for (let k = from; k <= to; k++) {
      const v = store.getEntry(store.addDays(today, -k))?.[key];
      if (typeof v === 'number') out.push(v);
    }
    return out;
  };
  const mean = (a) => a.reduce((x, y) => x + y, 0) / a.length;
  const r1 = (v) => fmtNum(Math.round(v * 10) / 10);
  const list = [];

  const s3 = vals('sleep', 0, 2), s14 = vals('sleep', 3, 16);
  if (s3.length >= 2 && s14.length >= 5) {
    const d = mean(s3) - mean(s14);
    if (d <= -1.5) list.push(['pink', say(`Последние дни ты спишь в среднем на ${r1(-d)} ч меньше, чем раньше. Посмотри, как это отражается на твоём самочувствии.`, `Сон за последние 3 дня в среднем на ${r1(-d)} ч короче, чем в предыдущие 2 недели.`)]);
    else if (d >= 1.5) list.push(['lilac', say(`Последние дни ты спишь на ${r1(d)} ч больше обычного. Посмотри, как при этом энергия и настроение.`, `Сон за последние 3 дня в среднем на ${r1(d)} ч длиннее, чем в предыдущие 2 недели.`)]);
  }

  const st = vals('state', 0, 6), stPrev = vals('state', 7, 13);
  if (st.length >= 3 && stPrev.length >= 3) {
    const d = mean(st) - mean(stPrev);
    if (d <= -1.5) list.push(['yellow', say(`Состояние за эту неделю ниже прошлой примерно на ${r1(-d)}. Будь к себе бережнее.`, `Средняя оценка состояния за последнюю неделю ниже предыдущей на ${r1(-d)}.`)]);
    else if (d >= 1.5) list.push(['green', say(`Состояние за эту неделю выше прошлой примерно на ${r1(d)}.`, `Средняя оценка состояния за последнюю неделю выше предыдущей на ${r1(d)}.`)]);
  }

  const en = vals('energy', 0, 6), enPrev = vals('energy', 7, 13);
  if (en.length >= 3 && enPrev.length >= 3 && mean(en) - mean(enPrev) >= 2) {
    list.push(['peach', say('Энергии заметно больше, чем неделю назад. Если при этом меньше сна — такое сочетание стоит отслеживать.', `Средняя энергия за последнюю неделю выше предыдущей на ${r1(mean(en) - mean(enPrev))}.`)]);
  }

  let missed = 0;
  for (let k = 0; k < 14; k++) if (store.getEntry(store.addDays(today, -k))?.meds === 'missed') missed++;
  if (store.medsOn() && missed) list.push(['peach', `За две недели пропущено приёмов лекарств: ${missed}.`]);

  let filled = 0;
  for (let k = 0; k < 14; k++) if (store.getEntry(store.addDays(today, -k))) filled++;
  if (filled < 5) return `<div class="insight bg-blue"><i></i><p>${say('Наблюдения появятся, когда наберётся хотя бы неделя отметок.', 'Недостаточно отметок для сравнения.')} Отмечено дней: ${filled} из 14.</p></div>`;
  if (!list.length) list.push(['green', say('Заметных изменений за последние две недели нет — всё ровно.', 'Заметных изменений за последние две недели не отмечено.')]);

  return list.map(([c, t]) => `<div class="insight bg-${c}"><i></i><p>${t}</p></div>`).join('');
}

export function avg(entries, key) {
  const vals = entries.map((e) => e[key]).filter((v) => typeof v === 'number');
  return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null;
}

function kSleepOptions(keys) {
  return keys[0] === 'sleep' && !store.advancedReportOn() ? { neutralSleep: true } : {};
}

function card(title, entries, keys, type) {
  const legend = keys.map((k) => {
    const a = avg(entries, k);
    return `<span><i style="background:${METRICS[k].color}"></i>${METRICS[k].label} · ср. <b>${a == null ? '—' : (k === 'sleep' ? fmtSleep(a) : fmtNum(Math.round(a * 10) / 10))}${k === 'sleep' ? ' ч' : ''}</b></span>`;
  }).join('');
  return `
    <section class="card chart-card">
      <h2 class="h2">${title}</h2>
      <div class="legend">${legend}</div>
      <div class="chart">${chartSvg(entries, keys, type, kSleepOptions(keys))}</div>
    </section>`;
}

// Готовый SVG-график: шкала 1–10 для оценок и 0–N часов для сна
export function chartSvg(entries, keys, type, thresholds = {}) {
  const isSleep = keys[0] === 'sleep';
  const sleepLow = Number.isFinite(thresholds.sleepLow) ? thresholds.sleepLow : 7;
  const sleepHigh = Number.isFinite(thresholds.sleepHigh) ? thresholds.sleepHigh : 9;
  const neutralSleep = !!thresholds.neutralSleep;
  const sleepValues = entries.map((e) => e.sleep).filter((v) => typeof v === 'number' && Number.isFinite(v));
  const max = isSleep ? Math.max(10, Math.ceil((sleepValues.length ? Math.max(...sleepValues) : 9) + 1), Math.ceil(sleepHigh + 1)) : 10;
  const min = isSleep ? Math.max(0, Math.min(5, Math.floor((sleepValues.length ? Math.min(...sleepValues) : 7) - 1), Math.floor(sleepLow - 1))) : 1;
  const ticks = isSleep ? [...new Set([min, sleepLow, sleepHigh, max])].filter((v) => v >= min && v <= max).sort((a,b) => a-b) : [1, 4, 7, 10];
  return svg(entries, keys, { type, min, max, ticks, sleepLow, sleepHigh, neutralSleep });
}

function svg(entries, keys, { type, min, max, ticks, sleepLow, sleepHigh, neutralSleep }) {
  const n = entries.length;
  const iw = W - PL - PR, ih = H - PT - PB;
  const xc = (i) => PL + ((i + 0.5) * iw) / n;
  const y = (v) => PT + ih - ((v - min) / (max - min)) * ih;
  const parts = [];

  // Мягкая полоса выбранного диапазона сна, не медицинская граница нормы.
  if (keys[0] === 'sleep' && !neutralSleep) {
    const top = y(Math.min(max, sleepHigh));
    const bottom = y(Math.max(min, sleepLow));
    if (bottom > top) parts.push('<rect x="' + PL + '" y="' + top + '" width="' + iw + '" height="' + (bottom - top) + '" fill="#DCEFE5" fill-opacity="0.6" rx="2"/>');
  }

  for (const t of ticks) {
    parts.push(`<line class="grid" x1="${PL}" x2="${W - PR}" y1="${y(t)}" y2="${y(t)}"/>`);
    parts.push(`<text x="${PL - 6}" y="${y(t) + 3}" text-anchor="end">${t}</text>`);
  }

  parts.push(xLabels(entries, xc));

  if (type === 'bar') {
    const k = keys[0];
    const bw = Math.max(2, (iw / n) * 0.62);
    entries.forEach((e, i) => {
      const v = e[k];
      if (typeof v !== 'number') return;
      const top = y(v);
      parts.push(`<rect class="bar" style="animation-delay:${Math.min(i * 12, 400)}ms;fill:${METRICS[k].color}" x="${xc(i) - bw / 2}" y="${top}" width="${bw}" height="${Math.max(1, y(min) - top)}" rx="${Math.min(4, bw / 2)}"><title>${fmtNum(v)} ч</title></rect>`);
    });
  } else {
    for (const k of keys) {
      const color = METRICS[k].color;
      // Измеренные соседние даты соединены сплошной линией.
      // Через пропущенные даты — только пунктир, без выдуманных значений.
      let previous = null;
      entries.forEach((e, i) => {
        const v = e[k];
        if (typeof v !== 'number' || !Number.isFinite(v)) return;
        if (previous) {
          const gap = i - previous.i > 1;
          const d = 'M' + xc(previous.i).toFixed(1) + ',' + y(previous.v).toFixed(1)
            + 'L' + xc(i).toFixed(1) + ',' + y(v).toFixed(1);
          parts.push('<path d="' + d + '" fill="none" stroke="' + color + '" stroke-width="' + (gap ? '1.6' : '2.2') + '"'
            + (gap ? ' stroke-dasharray="3 4" opacity="0.75"' : '') + ' stroke-linejoin="round" stroke-linecap="round"/>');
        }
        previous = { i, v };
      });
      if (n <= 31) {
        entries.forEach((e, i) => {
          const v = e[k];
          if (typeof v !== 'number' || !Number.isFinite(v)) return;
          const abnormal = k === 'sleep' && !neutralSleep && (v < sleepLow || v > sleepHigh);
          const dotColor = abnormal ? '#B4402F' : color;
          const label = k === 'sleep' ? fmtSleep(v) + ' ч' : String(v) + '/10';
          parts.push('<circle cx="' + xc(i) + '" cy="' + y(v) + '" r="' + (abnormal ? 3.7 : 2.8) + '" style="fill:' + dotColor + '"><title>' + METRICS[k].label + ': ' + label + ' (' + e.date + ')</title></circle>');
          if (k === 'sleep' && n <= 7) {
            const labelY = Math.max(11, y(v) - 9);
            parts.push('<text x="' + xc(i) + '" y="' + labelY + '" font-size="8" text-anchor="middle" fill="currentColor">' + fmtSleep(v) + '</text>');
          }
        });
      }
    }
  }

  return `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="График">${parts.join('')}</svg>`;
}

function xLabels(entries, xc) {
  const n = entries.length;
  const step = n <= 7 ? 1 : n <= 31 ? 5 : 15;
  const out = [];
  entries.forEach((e, i) => {
    if ((n - 1 - i) % step !== 0) return;
    const d = store.parseKey(e.date);
    const label = n <= 7 ? d.toLocaleDateString('ru-RU', { weekday: 'short' }) : `${d.getDate()}.${String(d.getMonth() + 1).padStart(2, '0')}`;
    out.push(`<text x="${xc(i)}" y="${H - 4}" text-anchor="middle">${label}</text>`);
  });
  return out.join('');
}

// Шкала с 12:00 предыдущего дня до 12:00 следующего.
// Старые записи с длительностью, но без времени сна, показываются как отсутствие данных режима.
export function sleepRhythmSvg(entries) {
  const days = entries.slice(-31);
  const plotLeft=46, plotWidth=266, row=13, top=30;
  const height=top+days.length*row+12;
  const tickValues=[12,18,24,30,36];
  const labels=['12:00','18:00','00:00','06:00','12:00'];
  const x=(v)=>plotLeft+(v-12)/24*plotWidth;
  const parts=[];
  tickValues.forEach((v,i)=>{
    parts.push('<line x1="'+x(v)+'" y1="21" x2="'+x(v)+'" y2="'+(height-7)+'" stroke="currentColor" stroke-opacity="0.17" stroke-width="0.6"/>');
    parts.push('<text x="'+x(v)+'" y="12" text-anchor="middle">'+labels[i]+'</text>');
  });
  days.forEach((e,i)=>{
    const center=top+i*row;
    parts.push('<text x="35" y="'+(center+3)+'" text-anchor="end">'+e.date.slice(5).replace('-','.')+'</text>');
    if (!e.sleepStart || !e.sleepEnd || typeof e.sleep !== 'number') {
      parts.push('<text x="'+x(24)+'" y="'+(center+3)+'" opacity="0.35" text-anchor="middle">—</text>');
      return;
    }
    const partsTime=e.sleepStart.split(':').map(Number);
    const clock=partsTime[0]+partsTime[1]/60;
    const start=clock<12?clock+24:clock;
    const end=start+e.sleep;
    if (end>36 || start<12 || start>36) {
      parts.push('<text x="'+x(24)+'" y="'+(center+3)+'" opacity="0.65" text-anchor="middle">вне шкалы</text>');
      return;
    }
    const color=e.sleep<7 || e.sleep>9?'#B86B60':'var(--c-sleep)';
    const width=Math.max(1,x(end)-x(start));
    parts.push('<rect x="'+x(start)+'" y="'+(center-4.5)+'" width="'+width+'" height="9" rx="3" fill="'+color+'"><title>'+e.date+': '+e.sleepStart+' – '+e.sleepEnd+', '+fmtSleep(e.sleep)+' ч</title></rect>');
  });
  return '<svg viewBox="0 0 320 '+height+'" role="img" aria-label="Режим сна по дням: время засыпания и пробуждения">'+parts.join('')+'</svg>';
}

export function marksCard(entries) {
  const meds = store.medsOn();
  const cycle = store.cycleOn();
  if (!meds && !cycle) return '';
  const n = entries.length;
  if (!n) return '';
  const both = meds && cycle;
  const h = both ? 56 : 32;
  const iw = W - PL - PR;
  const xc = (i) => PL + ((i + 0.5) * iw) / n;
  const r = Math.min(5, (iw / n) * 0.35);
  const yCycle = both ? 37 : 15;
  const parts = [
    meds ? `<text x="${PL - 4}" y="18" text-anchor="end">Лек</text>` : '',
    cycle ? `<text x="${PL - 4}" y="${yCycle + 3}" text-anchor="end">Цикл</text>` : '',
  ];
  entries.forEach((e,i) => {
    if (meds && e.meds === 'taken') parts.push(`<circle cx="${xc(i)}" cy="15" r="${r}" style="fill:var(--tone-high)"><title>Приём</title></circle>`);
    if (meds && e.meds === 'missed') parts.push(`<circle cx="${xc(i)}" cy="15" r="${r}" style="fill:var(--tone-low)"><title>Пропуск</title></circle>`);
    if (cycle && e.periodStart) parts.push(`<circle cx="${xc(i)}" cy="${yCycle}" r="${r}" style="fill:var(--c-anxiety)"><title>Начало цикла</title></circle>`);
  });
  return `
    <section class="card chart-card">
      <h2 class="h2">${both ? 'Лекарства и цикл' : meds ? 'Лекарства' : 'Менструальный цикл'}</h2>
      <div class="chart"><svg viewBox="0 0 ${W} ${h}" role="img" aria-label="${both ? 'Лекарства и цикл' : meds ? 'Лекарства' : 'Цикл'}">
        <line class="grid" x1="${PL}" x2="${W - PR}" y1="15" y2="15"/>
        ${both ? `<line class="grid" x1="${PL}" x2="${W - PR}" y1="37" y2="37"/>` : ''}
        ${parts.join('')}
      </svg></div>
      <div class="marks-legend">
        ${meds ? '<span><i style="width:10px;height:10px;border-radius:50%;background:var(--tone-high);display:inline-block"></i>Приём</span><span><i style="width:10px;height:10px;border-radius:50%;background:var(--tone-low);display:inline-block"></i>Пропуск</span>' : ''}
        ${cycle ? '<span><i style="width:10px;height:10px;border-radius:50%;background:var(--c-anxiety);display:inline-block"></i>Начало цикла</span>' : ''}
      </div>
    </section>`;
}
