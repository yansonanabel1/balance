import * as store from '../store.js';
import { art } from '../art.js';
import { fmtNum, icon, METRICS } from '../ui.js';

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
      <a class="btn sm ink" style="margin-top:14px" href="#/report">${icon('print')} Отчёт для врача</a></header>
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
      card('Сон', entries, ['sleep'], 'bar'),
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
    if (d <= -1.5) list.push(['pink', say(`Последние дни ты спишь в среднем на ${r1(-d)} ч меньше обычного. Резкое сокращение сна бывает ранним сигналом перемен в состоянии — обрати внимание, а если держится, расскажи врачу.`, `Сон за последние 3 дня в среднем на ${r1(-d)} ч короче, чем в предыдущие 2 недели.`)]);
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
  if (missed) list.push(['peach', `За две недели пропущено приёмов лекарств: ${missed}.`]);

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

function card(title, entries, keys, type) {
  const legend = keys.map((k) => {
    const a = avg(entries, k);
    return `<span><i style="background:${METRICS[k].color}"></i>${METRICS[k].label} · ср. <b>${a == null ? '—' : fmtNum(Math.round(a * 10) / 10)}${k === 'sleep' ? ' ч' : ''}</b></span>`;
  }).join('');
  return `
    <section class="card chart-card">
      <h2 class="h2">${title}</h2>
      <div class="legend">${legend}</div>
      <div class="chart">${chartSvg(entries, keys, type)}</div>
    </section>`;
}

// Готовый SVG-график: шкала 1–10 для оценок и 0–N часов для сна
export function chartSvg(entries, keys, type) {
  const isSleep = keys[0] === 'sleep';
  const max = isSleep ? Math.max(10, ...entries.map((e) => e.sleep || 0)) : 10;
  const min = isSleep ? 0 : 1;
  const ticks = isSleep ? [0, 4, 8, max > 12 ? 12 : null].filter((t) => t != null && t <= max) : [1, 4, 7, 10];
  return svg(entries, keys, { type, min, max, ticks });
}

function svg(entries, keys, { type, min, max, ticks }) {
  const n = entries.length;
  const iw = W - PL - PR, ih = H - PT - PB;
  const xc = (i) => PL + ((i + 0.5) * iw) / n;
  const y = (v) => PT + ih - ((v - min) / (max - min)) * ih;
  const parts = [];

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
      // линия рвётся там, где нет данных
      let d = '';
      let pen = false;
      entries.forEach((e, i) => {
        const v = e[k];
        if (typeof v === 'number') {
          d += `${pen ? 'L' : 'M'}${xc(i).toFixed(1)},${y(v).toFixed(1)}`;
          pen = true;
        } else pen = false;
      });
      if (d) parts.push(`<path class="draw" pathLength="1" d="${d}" fill="none" stroke-width="2.2" stroke-linejoin="round" stroke-linecap="round" style="stroke:${color}"/>`);
      if (n <= 31) {
        entries.forEach((e, i) => {
          const v = e[k];
          if (typeof v === 'number') parts.push(`<circle cx="${xc(i)}" cy="${y(v)}" r="2.8" style="fill:${color}"><title>${METRICS[k].label}: ${v}</title></circle>`);
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

export function marksCard(entries) {
  const cycle = store.cycleOn();
  const n = entries.length;
  const h = cycle ? 56 : 32;
  const iw = W - PL - PR;
  const xc = (i) => PL + ((i + 0.5) * iw) / n;
  const r = Math.min(5, (iw / n) * 0.35);
  const parts = [
    `<text x="${PL - 4}" y="18" text-anchor="end">Лек</text>`,
    cycle ? `<text x="${PL - 4}" y="40" text-anchor="end">Цикл</text>` : '',
  ];
  entries.forEach((e, i) => {
    if (e.meds === 'taken') parts.push(`<circle cx="${xc(i)}" cy="15" r="${r}" style="fill:var(--tone-high)"><title>Приём</title></circle>`);
    if (e.meds === 'missed') parts.push(`<circle cx="${xc(i)}" cy="15" r="${r}" style="fill:var(--tone-low)"><title>Пропуск</title></circle>`);
    if (cycle && e.periodStart) parts.push(`<circle cx="${xc(i)}" cy="37" r="${r}" style="fill:var(--c-anxiety)"><title>Начало цикла</title></circle>`);
  });
  return `
    <section class="card chart-card">
      <h2 class="h2">${cycle ? 'Лекарства и цикл' : 'Лекарства'}</h2>
      <div class="chart"><svg viewBox="0 0 ${W} ${h}" role="img" aria-label="${cycle ? 'Отметки лекарств и цикла' : 'Отметки лекарств'}">
        <line class="grid" x1="${PL}" x2="${W - PR}" y1="15" y2="15"/>
        ${cycle ? `<line class="grid" x1="${PL}" x2="${W - PR}" y1="37" y2="37"/>` : ''}
        ${parts.join('')}
      </svg></div>
      <div class="marks-legend">
        <span><i class="dot-sw" style="width:10px;height:10px;border-radius:50%;background:var(--tone-high);display:inline-block"></i>Приём</span>
        <span><i style="width:10px;height:10px;border-radius:50%;background:var(--tone-low);display:inline-block"></i>Пропуск</span>
        ${cycle ? '<span><i style="width:10px;height:10px;border-radius:50%;background:var(--c-anxiety);display:inline-block"></i>Начало цикла</span>' : ''}
      </div>
    </section>`;
}
