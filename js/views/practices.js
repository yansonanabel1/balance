import * as store from '../store.js';
import { art } from '../art.js';
import { CATEGORIES, EMOTION_STAGES, PRACTICES, STAGE_HELP, STAGE_LABELS } from '../practices-data.js';
import { esc, gx, icon, openSheet, plural, toast } from '../ui.js';

// текст практики в нужном роде и безопасный для HTML
const tx = (s) => esc(gx(s));

let filter = 'all';

const SOURCE_LABEL = { psy: 'От психолога', 'КПТ': 'КПТ', 'ДБТ': 'ДБТ', 'Тело': 'Тело' };

// свои (всегда «от психолога») + встроенные. Своя практика с тем же id заменяет встроенную —
// так личная версия, например «Холод» от своего психолога, показывается вместо общей.
function all() {
  const custom = store.customPractices().map((p) => ({
    color: 'bg-lilac', art: 'sprout', cat: [], time: '', short: p.when || '', ...p, source: 'psy', custom: true,
  }));
  const own = new Set(custom.map((p) => p.id));
  return [...custom, ...PRACTICES.filter((p) => !own.has(p.id))];
}

export function find(id) {
  return all().find((p) => p.id === id);
}

function stats(id) {
  const { tries, fav } = store.practiceState(id);
  const rated = tries.filter((t) => t.rating);
  const avg = rated.length ? rated.reduce((s, t) => s + t.rating, 0) / rated.length : null;
  return { count: tries.length, avg, fav };
}

function meta(p) {
  const s = stats(p.id);
  const bits = [];
  if (p.time) bits.push(esc(p.time));
  if (s.count) bits.push(`${s.count} ${plural(s.count, ['раз', 'раза', 'раз'])}`);
  if (s.avg) bits.push(`помогает на ${s.avg.toFixed(1).replace('.', ',')} из 5`);
  return bits.join(' · ');
}

function row(p) {
  const s = stats(p.id);
  return `
    <a class="pcard" href="#/practice/${encodeURIComponent(p.id)}">
      <span class="pcard-art ${p.color}">${art(p.art)}</span>
      <span class="pcard-body">
        <b>${tx(p.title)}</b>
        <span>${tx(p.short)}</span>
        ${meta(p) ? `<small>${meta(p)}</small>` : ''}
      </span>
      ${s.fav ? `<span class="pcard-fav">${icon('heart')}</span>` : ''}
    </a>`;
}

function tile(p) {
  return `
    <a class="tile ${p.color}" href="#/practice/${encodeURIComponent(p.id)}">
      <p class="eyebrow muted">${SOURCE_LABEL[p.source]}</p>
      <h3>${tx(p.title)}</h3>
      <p class="muted">${tx(p.short)}</p>
      ${art(p.art)}
    </a>`;
}

export function renderList(root) {
  const list = all();

  root.innerHTML = `
    <header class="page-head"><p class="eyebrow">Учиться помогать себе</p><h1 class="display">Практики</h1></header>

    <div class="tiles">
      <a class="tile bg-blue" href="#/breathe"><h3>Дыхание</h3><p class="muted">Таймеры: 4-6, 4-7-8, квадрат</p>${art('kite')}</a>
      <a class="tile bg-pink" href="#/emotions"><h3>Эмоции в теле</h3><p class="muted">Как они начинаются и растут</p>${art('body')}</a>
    </div>

    <div class="filters" role="group" aria-label="Фильтр практик">
      ${CATEGORIES.map(([id, label]) => `<button data-f="${id}" aria-pressed="${filter === id}">${label}</button>`).join('')}
    </div>

    <div class="plist"></div>
  `;

  const holder = root.querySelector('.plist');
  const draw = () => {
    if (filter === 'all') {
      const psy = list.filter((p) => p.source === 'psy');
      const rest = list.filter((p) => p.source !== 'psy');
      holder.innerHTML = `
        <section class="section">
          <div class="section-title"><h2 class="h2">От моего психолога</h2><span class="hand">лично для меня</span></div>
          ${psy.length ? `<div class="pcards">${psy.map(row).join('')}</div>` : '<p class="note" style="margin:0">Здесь будут упражнения, которые дал твой психолог или врач. Запиши их своими словами — так легче вспомнить в нужный момент.</p>'}
          <a class="btn ghost wide" style="margin-top:12px" href="#/practice-edit/new">${icon('plus')} Добавить практику от психолога</a>
        </section>
        <section class="section">
          <div class="section-title"><h2 class="h2">КПТ и ДБТ</h2></div>
          <div class="tiles">${rest.map(tile).join('')}</div>
        </section>`;
      return;
    }
    const shown = list.filter((p) =>
      filter === 'psy' ? p.source === 'psy' : filter === 'fav' ? stats(p.id).fav : p.cat.includes(filter));
    holder.innerHTML = shown.length
      ? `<div class="pcards section">${shown.map(row).join('')}</div>`
      : `<div class="empty-state section"><p>${filter === 'fav' ? 'Отмечай сердечком практики, которые помогают, — они соберутся здесь.' : 'Здесь пока пусто.'}</p></div>`;
  };

  for (const b of root.querySelectorAll('.filters button')) {
    b.onclick = () => {
      filter = b.dataset.f;
      root.querySelectorAll('.filters button').forEach((x) => x.setAttribute('aria-pressed', x === b));
      draw();
    };
  }
  draw();
}

export function renderPractice(root, { id }) {
  const p = find(id);
  if (!p) {
    root.innerHTML = `<div class="empty-state">${art('notebook')}<h2 class="h2">Практика не найдена</h2><a class="btn primary" href="#/practices">К практикам</a></div>`;
    return;
  }

  const draw = () => {
    const s = stats(p.id);
    root.innerHTML = `
      <div class="detail-head">
        <a class="icon-btn" href="#/practices" aria-label="К практикам">${icon('back')}</a>
        <button class="icon-btn fav-btn" data-act="fav" aria-pressed="${s.fav}" aria-label="${s.fav ? 'Убрать из избранного' : 'В избранное'}">${icon('heart')}</button>
      </div>

      <section class="tile practice-hero ${p.color}">
        <span class="chip">${SOURCE_LABEL[p.source]}${p.time ? ` · ${esc(p.time)}` : ''}</span>
        ${art(p.art)}
      </section>

      <h1 class="display" style="margin-top:18px">${tx(p.title)}</h1>
      ${p.short ? `<p class="lead-text">${tx(p.short)}</p>` : ''}
      ${s.count ? `<p class="small muted">${meta(p)}</p>` : ''}

      ${p.when ? `<section class="section card"><p class="label">Когда помогает</p><p class="body-text">${tx(p.when)}</p>${p.why ? `<p class="label" style="margin-top:14px">Зачем</p><p class="body-text">${tx(p.why)}</p>` : ''}</section>` : ''}

      <section class="section">
        <div class="section-title"><h2 class="h2">Задание</h2><span class="hand">по шагам</span></div>
        <ol class="steps-list">${(p.steps || []).map((st) => `<li>${tx(st)}</li>`).join('')}</ol>
      </section>

      ${p.tip ? `<section class="section prompt-card bg-yellow on-pastel"><p class="eyebrow">Подсказка</p><p>${tx(p.tip)}</p></section>` : ''}
      ${p.link ? `<a class="btn ghost wide section" href="${p.link.href}">${esc(p.link.label)}</a>` : ''}

      ${p.custom ? `<div class="actions">
        <a class="btn sm ghost" href="#/practice-edit/${encodeURIComponent(p.id)}">${icon('edit')} Изменить</a>
        <button class="btn sm danger" data-act="delete">${icon('trash')} Удалить</button>
      </div>` : ''}

      <div class="sticky-cta"><button class="btn primary wide" data-act="try">Я попробовала</button></div>
    `;

    root.querySelector('[data-act="fav"]').onclick = () => {
      const on = store.toggleFavorite(p.id);
      toast(on ? 'Добавлено в избранное' : 'Убрано из избранного');
      draw();
    };
    root.querySelector('[data-act="try"]').onclick = () => rate(p, draw);
    const del = root.querySelector('[data-act="delete"]');
    if (del) {
      del.onclick = () => {
        if (!confirm('Удалить эту практику?')) return;
        store.deleteCustomPractice(p.id);
        location.hash = '#/practices';
      };
    }
  };
  draw();
}

function rate(p, after) {
  const opts = [[1, 'Не помогло'], [2, 'Чуть-чуть'], [3, 'Немного'], [4, 'Помогло'], [5, 'Очень помогло']];
  openSheet(`
    ${art('sprout')}
    <h2>Насколько помогло?</h2>
    <p class="lead muted">Оценки покажут, какие практики работают именно для тебя.</p>
    <div class="choices">
      ${opts.map(([v, l]) => `<button class="choice" data-v="${v}"><span class="mark">${v}</span>${l}</button>`).join('')}
    </div>
    <button class="link-btn" data-v="0" style="width:100%;margin-top:8px">Без оценки</button>
  `, (dlg) => {
    for (const b of dlg.querySelectorAll('[data-v]')) {
      b.onclick = () => {
        store.addPracticeTry(p.id, Number(b.dataset.v) || null);
        dlg.close();
        toast('Записала');
        after();
      };
    }
  });
}

export function renderEdit(root, { id }) {
  const existing = id !== 'new' ? store.customPractices().find((p) => p.id === id) : null;
  const p = existing || { title: '', when: '', steps: [], tip: '' };

  root.innerHTML = `
    <div class="detail-head">
      <a class="icon-btn" href="${existing ? `#/practice/${encodeURIComponent(id)}` : '#/practices'}" aria-label="Назад">${icon('back')}</a>
    </div>
    <h1 class="display" style="margin-bottom:6px">${existing ? 'Изменить практику' : 'Новая практика'}</h1>
    <p class="muted" style="margin:0 0 20px">Запиши то, что дал психолог, своими словами — так легче вспомнить в нужный момент.</p>
    <form class="list" data-form>
      <label class="field"><span class="label">Название</span><input class="input" name="title" required value="${esc(p.title)}" placeholder="Например: Счёт до десяти"></label>
      <label class="field"><span class="label">Когда помогает</span><input class="input" name="when" value="${esc(p.when)}" placeholder="В какой ситуации её делать"></label>
      <label class="field"><span class="label">Шаги — каждый с новой строки</span><textarea name="steps" placeholder="1-й шаг&#10;2-й шаг">${esc((p.steps || []).join('\n'))}</textarea></label>
      <label class="field"><span class="label">Подсказка (необязательно)</span><input class="input" name="tip" value="${esc(p.tip || '')}"></label>
      <button class="btn primary wide" type="submit">Сохранить</button>
    </form>`;

  root.querySelector('[data-form]').onsubmit = (ev) => {
    ev.preventDefault();
    const f = new FormData(ev.target);
    const title = String(f.get('title')).trim();
    if (!title) return;
    const saved = {
      ...existing,
      id: existing?.id || `c-${Date.now()}`,
      title,
      when: String(f.get('when')).trim(),
      steps: String(f.get('steps')).split('\n').map((s) => s.trim()).filter(Boolean),
      tip: String(f.get('tip')).trim(),
    };
    store.saveCustomPractice(saved);
    toast('Практика сохранена');
    location.hash = `#/practice/${encodeURIComponent(saved.id)}`;
  };
}

const FIELDS = [
  ['start', 'Как начинается — первый сигнал'],
  ['rise', 'Как нарастает'],
  ['peak', 'На пике'],
  ['help', 'Что помогает'],
];

// Ссылка на практику показывается, только если такая практика есть у этого человека
function helpLink(link) {
  if (!link) return '';
  const id = link[0].startsWith('#/practice/') ? link[0].slice('#/practice/'.length) : null;
  if (id && !find(id)) return '';
  return ` <a href="${link[0]}">${esc(id ? gx(find(id).title) : link[1])} →</a>`;
}

export function renderEmotions(root) {
  root.innerHTML = `
    <div class="detail-head"><a class="icon-btn" href="#/practices" aria-label="К практикам">${icon('back')}</a></div>
    <header class="page-head"><span class="hand">5 ступеней силы</span><h1 class="display">Эмоции в теле</h1></header>
    <p class="muted" style="margin-top:-8px">Как каждая эмоция ощущается в теле — от едва заметной до пика — и что помогает на каждой ступени. Чем раньше заметишь эмоцию, тем легче с ней справиться.</p>
    <div class="emo-list section">
      ${EMOTION_STAGES.map((emo) => {
        const n = store.emotionNote(emo.name);
        const filled = FIELDS.filter(([k]) => n[k]).length;
        const help = STAGE_HELP[emo.kind];
        return `
        <details class="emo-card">
          <summary class="${emo.color} on-pastel">
            <span><b>${emo.name}</b><span class="muted">5 ступеней${filled ? ` · мои заметки ${filled} из 4` : ''}</span></span>
            <span class="go">${icon('next')}</span>
          </summary>
          <div class="emo-fields" data-emo="${esc(emo.name)}">
            <ol class="ladder">
              ${emo.stages.map((text, k) => `
                <li class="lvl lvl-${k + 1} ${emo.kind}">
                  <span class="lvl-n">${k + 1}</span>
                  <div>
                    <p class="lvl-name">${STAGE_LABELS[k]}</p>
                    <p class="lvl-body">${tx(text)}</p>
                    <p class="lvl-help"><b>Что помогает:</b> ${tx(help[k].text)}${helpLink(help[k].link)}</p>
                  </div>
                </li>`).join('')}
            </ol>
            ${emo.note ? `<p class="emo-note">${tx(emo.note)}</p>` : ''}
            <p class="label" style="margin:10px 0 0">Мои наблюдения${filled ? ` · заполнено ${filled} из 4` : ''}</p>
            ${FIELDS.map(([k, l]) => `<label class="field"><span class="label">${l}</span><textarea data-k="${k}" rows="2">${esc(n[k] || '')}</textarea></label>`).join('')}
          </div>
        </details>`;
      }).join('')}
    </div>
    <p class="note section">Признаки собраны по материалам ДБТ (М. Линехан, «Способы описания эмоций», Emotion Regulation Handout 6), КПТ (Centre for Clinical Interventions, «Что такое тревога») и NIMH. Деление на 5 ступеней примерное: у каждого человека лестница своя, поэтому дополняй её своими наблюдениями.</p>`;

  // сохраняем по ходу набора
  let t = null;
  root.querySelector('.emo-list').addEventListener('input', (ev) => {
    const ta = ev.target.closest('textarea[data-k]');
    if (!ta) return;
    const name = ta.closest('[data-emo]').dataset.emo;
    clearTimeout(t);
    t = setTimeout(() => store.saveEmotionNote(name, { [ta.dataset.k]: ta.value.trim() }), 400);
  });
  root.querySelector('.emo-list').addEventListener('change', (ev) => {
    const ta = ev.target.closest('textarea[data-k]');
    if (!ta) return;
    clearTimeout(t);
    store.saveEmotionNote(ta.closest('[data-emo]').dataset.emo, { [ta.dataset.k]: ta.value.trim() });
  });
}
