import * as store from '../store.js';
import { art } from '../art.js';
import { emotionChips, esc, fmtDate, fmtNum, fmtShort, icon, MEDS, METRICS, metricChips, plural, stateColor, toast } from '../ui.js';

// показываемый месяц живёт между перерисовками
let month = null;

export function renderList(root) {
  const entries = store.allEntries();
  const today = store.dateKey();
  if (!month) month = today.slice(0, 7);

  if (!entries.length) {
    root.innerHTML = `
      <header class="page-head"><p class="eyebrow">Пока пусто</p><h1 class="display">Дневник</h1></header>
      <div class="empty-state">
        ${art('notebook')}
        <h2 class="h2">Здесь будут твои записи</h2>
        <p>Каждая утренняя отметка попадает сюда — с оценками, чувствами и текстом.</p>
        <a class="btn primary" href="#/checkin/${today}">Сделать первую отметку</a>
      </div>`;
    return;
  }

  root.innerHTML = `
    <header class="page-head"><p class="eyebrow">${entries.length} ${plural(entries.length, ['запись', 'записи', 'записей'])}</p><h1 class="display">Дневник</h1></header>
    <section class="card cal"></section>
    <section class="section">
      <label class="search">${icon('search')}<input type="search" placeholder="Поиск по всем записям" aria-label="Поиск по записям"></label>
      <div class="entry-list" style="margin-top:14px"></div>
    </section>`;

  const cal = root.querySelector('.cal');
  const list = root.querySelector('.entry-list');
  const search = root.querySelector('input[type="search"]');

  const drawCal = () => {
    const [y, m] = month.split('-').map(Number);
    const first = new Date(y, m - 1, 1);
    const daysIn = new Date(y, m, 0).getDate();
    const offset = (first.getDay() + 6) % 7; // понедельник — первый
    const title = first.toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' }).replace(' г.', '');
    const cells = [];
    for (let k = 0; k < offset; k++) cells.push('<span></span>');
    for (let d = 1; d <= daysIn; d++) {
      const key = `${month}-${String(d).padStart(2, '0')}`;
      const e = store.getEntry(key);
      const c = stateColor(e?.state);
      const cls = ['cal-day', e ? 'has' : '', key === today ? 'today' : '', key > today ? 'future' : ''].join(' ');
      const bg = c ? `background:${c}` : e ? 'background:var(--surface-2);color:var(--text)' : '';
      cells.push(`<a class="${cls}" style="${bg}" href="${e ? `#/entry/${key}` : `#/checkin/${key}`}" aria-label="${esc(fmtDate(key))}${e ? '' : ', нет записи — заполнить'}">${d}</a>`);
    }
    const nextMonth = month < today.slice(0, 7);
    cal.innerHTML = `
      <div class="cal-head">
        <button class="icon-btn" data-m="-1" aria-label="Предыдущий месяц">${icon('back')}</button>
        <h2 class="h2">${title.charAt(0).toUpperCase() + title.slice(1)}</h2>
        <button class="icon-btn" data-m="1" aria-label="Следующий месяц" ${nextMonth ? '' : 'disabled style="visibility:hidden"'}>${icon('next')}</button>
      </div>
      <div class="cal-grid">
        ${['пн', 'вт', 'ср', 'чт', 'пт', 'сб', 'вс'].map((w) => `<span class="wd">${w}</span>`).join('')}
        ${cells.join('')}
      </div>
      <div class="cal-legend">
        <span><i style="background:var(--tone-low)"></i>1–3</span>
        <span><i style="background:var(--tone-mid)"></i>4–6</span>
        <span><i style="background:var(--tone-high)"></i>7–10</span>
      </div>`;
    for (const b of cal.querySelectorAll('[data-m]')) {
      b.onclick = () => {
        const d = new Date(y, m - 1 + Number(b.dataset.m), 1);
        month = store.dateKey(d).slice(0, 7);
        drawCal();
        drawList();
      };
    }
  };

  const drawList = () => {
    const q = search.value.trim().toLowerCase();
    const shown = q
      ? entries.filter((e) => `${e.text || ''} ${(e.emotions || []).join(' ')}`.toLowerCase().includes(q))
      : entries.filter((e) => e.date.startsWith(month));
    list.innerHTML = shown.length ? shown.map(card).join('') : `<p class="empty-state">${q ? 'Ничего не нашлось' : 'В этом месяце записей нет'}</p>`;
  };

  search.oninput = drawList;
  drawCal();
  drawList();
}

function card(e) {
  const extra = [];
  if (e.meds === 'missed') extra.push('<span class="chip">Пропуск лекарств</span>');
  if (e.periodStart && store.cycleOn()) extra.push('<span class="chip">1-й день цикла</span>');
  return `
    <a class="card entry-card" href="#/entry/${e.date}">
      <span class="date">${esc(fmtShort(e.date))}</span>
      <div class="chips">${metricChips(e)}${emotionChips(e.emotions)}${extra.join('')}</div>
      <p class="text ${e.text ? '' : 'empty'}">${e.text ? esc(e.text) : 'Без текста'}</p>
    </a>`;
}

export function renderEntry(root, { date }) {
  const e = store.isDateKey(date) && store.getEntry(date);
  if (!e) {
    root.innerHTML = `<div class="empty-state">${art('notebook')}<h2 class="h2">Записи нет</h2><a class="btn primary" href="#/diary">К дневнику</a></div>`;
    return;
  }

  const cd = store.cycleOn() ? store.cycleDay(date) : null;
  const metrics = ['sleep', 'state', 'energy', 'anxiety', 'irritability']
    .filter((k) => typeof e[k] === 'number')
    .map((k) => `
      <div class="metric">
        <div class="k"><i style="background:${METRICS[k].color}"></i>${METRICS[k].label}</div>
        <div class="v">${k === 'sleep' ? `${fmtNum(e[k])}<small> ч</small>` : `${e[k]}<small> / 10</small>`}</div>
      </div>`).join('');

  const facts = [];
  if (e.meds) facts.push(MEDS[e.meds]);
  if (cd) facts.push(`${cd}-й день цикла`);

  root.innerHTML = `
    <div class="detail-head">
      <a class="icon-btn" href="#/diary" aria-label="К дневнику">${icon('back')}</a>
      <a class="btn sm ghost" href="#/checkin/${date}">${icon('edit')} Изменить</a>
    </div>
    <p class="eyebrow">${esc(fmtDate(date, { weekday: 'long' }))}</p>
    <h1 class="display" style="margin-bottom:20px">${esc(fmtDate(date, { day: 'numeric', month: 'long' }))}</h1>

    ${metrics ? `<div class="metric-grid">${metrics}</div>` : ''}
    ${facts.length || e.emotions?.length ? `<div class="chips" style="margin-top:12px">${emotionChips(e.emotions)}${facts.map((f) => `<span class="chip">${esc(f)}</span>`).join('')}</div>` : ''}

    <section class="section card">
      <h2 class="h2">Что меня беспокоит?</h2>
      ${e.prompt && e.text ? `<p class="small muted" style="margin:4px 0 0">Вопрос дня: ${esc(e.prompt)}</p>` : ''}
      ${e.text ? `<p class="diary-text">${esc(e.text)}</p>` : `<p class="muted">Текста нет. <a href="#/checkin/${date}/feelings">Написать</a></p>`}
    </section>

    <div class="actions"><button class="btn danger sm" data-act="delete">${icon('trash')} Удалить запись</button></div>
  `;

  root.querySelector('[data-act="delete"]').onclick = () => {
    if (!confirm('Удалить запись за этот день? Вернуть её не получится.')) return;
    store.deleteEntry(date);
    toast('Запись удалена');
    location.hash = '#/diary';
  };
}
