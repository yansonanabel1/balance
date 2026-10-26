import { parseKey, settings } from './store.js';

export function applyTheme() {
  const t = settings().theme;
  if (t === 'light' || t === 'dark') document.documentElement.dataset.theme = t;
  else delete document.documentElement.dataset.theme;
}

// Шторка снизу: html — содержимое, bind(dlg) — навесить обработчики
export function openSheet(html, bind) {
  const dlg = document.getElementById('sheet');
  dlg.innerHTML = `<div class="grab"></div>${html}`;
  dlg.onclick = (ev) => {
    const r = dlg.getBoundingClientRect();
    if (ev.target === dlg && (ev.clientY < r.top || ev.clientY > r.bottom || ev.clientX < r.left || ev.clientX > r.right)) dlg.close();
  };
  bind?.(dlg);
  dlg.showModal();
  // иначе браузер ставит фокус на первую кнопку и она выглядит выбранной
  dlg.tabIndex = -1;
  dlg.focus();
  return dlg;
}

export function toast(text) {
  const el = document.createElement('div');
  el.className = 'toast';
  el.setAttribute('role', 'status');
  el.textContent = text;
  document.body.append(el);
  setTimeout(() => el.remove(), 2500);
}

export const esc = (s) =>
  String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);

export function fmtDate(k, opts = { day: 'numeric', month: 'long', weekday: 'long' }) {
  return cap(parseKey(k).toLocaleDateString('ru-RU', opts));
}

export function fmtShort(k) {
  return cap(parseKey(k).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short', weekday: 'short' }));
}

export function fmtNum(v) {
  return Number.isInteger(v) ? String(v) : v.toFixed(1).replace('.', ',');
}

export function plural(n, [one, few, many]) {
  const m10 = n % 10, m100 = n % 100;
  if (m10 === 1 && m100 !== 11) return one;
  if (m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14)) return few;
  return many;
}

export const METRICS = {
  sleep: { label: 'Сон', short: 'Сон', color: 'var(--c-sleep)' },
  state: { label: 'Состояние', short: 'Состояние', color: 'var(--c-state)' },
  energy: { label: 'Энергия', short: 'Энергия', color: 'var(--c-energy)' },
  anxiety: { label: 'Тревога', short: 'Тревога', color: 'var(--c-anxiety)' },
  irritability: { label: 'Раздражительность', short: 'Раздраж.', color: 'var(--c-irritability)' },
};

export const MEDS = {
  taken: 'Лекарства приняты',
  missed: 'Лекарства пропущены',
  none: 'Лекарства не нужны',
};

export function metricChips(e) {
  const chips = [];
  if (typeof e.sleep === 'number') chips.push(chip('sleep', `${fmtNum(e.sleep)} ч`));
  for (const k of ['state', 'energy', 'anxiety', 'irritability']) {
    if (typeof e[k] === 'number') chips.push(chip(k, e[k]));
  }
  return chips.join('');
}

function chip(key, value) {
  const m = METRICS[key];
  return `<span class="chip"><i style="background:${m.color}"></i>${m.short} <b>${value}</b></span>`;
}

// Цвет оценки состояния для точек недели и календаря
export function stateColor(v) {
  if (typeof v !== 'number') return null;
  if (v <= 3) return 'var(--tone-low)';
  if (v <= 6) return 'var(--tone-mid)';
  return 'var(--tone-high)';
}

// Тон кнопки шкалы 1–10: для тревоги и раздражительности «хорошо» — это низкие значения
export function scaleTone(v, reversed) {
  return stateColor(reversed ? 11 - v : v);
}

export const EMOTIONS = [
  ['Тревога', '#7C8BE6'], ['Страх', '#9A7BE0'], ['Паника', '#D96B5B'],
  ['Грусть', '#6FA3D9'], ['Апатия', '#9C958B'], ['Усталость', '#B9A27A'],
  ['Злость', '#D9573F'], ['Раздражение', '#E0913A'], ['Вина', '#B07CC6'],
  ['Стыд', '#C97B9A'], ['Одиночество', '#5FAFB0'], ['Пустота', '#A8A29A'],
  ['Спокойствие', '#7CC495'], ['Радость', '#EDB93A'], ['Интерес', '#4FB39C'],
  ['Благодарность', '#E89AA8'], ['Воодушевление', '#F0A04B'],
];

export function emotionColor(name) {
  return EMOTIONS.find(([n]) => n === name)?.[1] || 'var(--muted)';
}

export function emotionChips(list) {
  return (list || []).map((n) => `<span class="chip"><i style="background:${emotionColor(n)}"></i>${esc(n)}</span>`).join('');
}

export function greeting(d = new Date()) {
  const h = d.getHours();
  if (h < 5) return 'Доброй ночи';
  if (h < 12) return 'Доброе утро';
  if (h < 18) return 'Добрый день';
  return 'Добрый вечер';
}

const PROMPTS = [
  'Что сегодня забирает больше всего сил?',
  'Что я сейчас чувствую в теле?',
  'Что маленькое могло бы сделать этот день чуть легче?',
  'О чём я думаю чаще всего в последние дни?',
  'Что я могу сегодня отпустить?',
  'За что я могу себя сегодня похвалить?',
  'Что меня порадовало вчера, хотя бы немного?',
  'Какая мысль сейчас звучит громче всего? Насколько она правдива?',
  'Что бы я сказала подруге в моей ситуации?',
  'Чего мне сейчас не хватает?',
  'Что в этой ситуации зависит от меня, а что нет?',
  'Как я спала и как это отражается на настроении?',
  'Есть ли что-то, что я откладываю? Почему?',
  'Кто или что меня сейчас поддерживает?',
  'Мои мысли сейчас ускоряются или замедляются?',
  'Какое у меня сегодня одно главное дело?',
  'Что я чувствую, когда думаю о предстоящем дне?',
  'Где я в последнее время слишком строга к себе?',
  'Что помогло мне в прошлый раз, когда было похоже?',
  'Что я сейчас вижу, слышу и чувствую вокруг?',
  'Что меня раздражает и что за этим стоит?',
  'Какую свою потребность я сегодня не замечаю?',
  'Что я хочу почувствовать к вечеру?',
  'Какие планы кажутся мне сейчас слишком большими?',
  'Какой маленький шаг заботы о себе я сделаю сегодня?',
  'Что бы я хотела сказать себе вчерашней?',
  'Что я узнала о себе на этой неделе?',
  'Есть ли признаки, что мне нужно больше отдыха?',
  'Я общалась с людьми больше или меньше обычного?',
  'Что сейчас даёт мне ощущение опоры?',
];

export function promptOfDay(k) {
  const d = parseKey(k);
  const dayOfYear = Math.floor((d - new Date(d.getFullYear(), 0, 0)) / 864e5);
  return PROMPTS[dayOfYear % PROMPTS.length];
}

const ICONS = {
  home: '<path d="M4 11.5 12 5l8 6.5V19a1 1 0 0 1-1 1h-4.5v-5h-5v5H5a1 1 0 0 1-1-1z"/>',
  book: '<path d="M12 6.5C10 5 7 4.6 4 5v13c3-.4 6 0 8 1.5 2-1.5 5-1.9 8-1.5V5c-3-.4-6 0-8 1.5zM12 6.5v13"/>',
  chart: '<path d="M4 19h16M7 15l3.5-4 3 2.5L18 8"/>',
  wind: '<path d="M4 9h10.5a2.5 2.5 0 1 0-2.5-2.5M4 13h14a2.5 2.5 0 1 1-2.5 2.5M4 17h6"/>',
  gear: '<circle cx="12" cy="12" r="3"/><path d="M12 3.5v2.2M12 18.3v2.2M20.5 12h-2.2M5.7 12H3.5M18 6l-1.6 1.6M7.6 16.4 6 18M18 18l-1.6-1.6M7.6 7.6 6 6"/>',
  back: '<path d="M15 5l-7 7 7 7"/>',
  close: '<path d="M6 6l12 12M18 6 6 18"/>',
  edit: '<path d="M5 19h4L19 9l-4-4L5 15zM13 7l4 4"/>',
  trash: '<path d="M5 7h14M10 7V5h4v2M7 7l1 12h8l1-12"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  heart: '<path d="M12 19s-7-4.4-7-9.5A3.8 3.8 0 0 1 12 7a3.8 3.8 0 0 1 7 2.5C19 14.6 12 19 12 19z"/>',
  moon: '<path d="M19 14.5A7.5 7.5 0 0 1 9.5 5a7.5 7.5 0 1 0 9.5 9.5z"/>',
  calendar: '<rect x="4" y="5.5" width="16" height="14" rx="2"/><path d="M4 10h16M8.5 3.5v4M15.5 3.5v4"/>',
  search: '<circle cx="11" cy="11" r="6"/><path d="m20 20-4.5-4.5"/>',
  check: '<path d="m5 12.5 4.5 4.5L19 7.5"/>',
  next: '<path d="m9 5 7 7-7 7"/>',
  leaf: '<path d="M5 19c0-8 6-14 15-14 0 9-6 14-13 14zM5 19l8-8"/>',
  print: '<path d="M7 9V4h10v5M7 17H5a1 1 0 0 1-1-1v-6a1 1 0 0 1 1-1h14a1 1 0 0 1 1 1v6a1 1 0 0 1-1 1h-2M7 14h10v6H7z"/>',
  send: '<path d="M4 12 20 4l-4 16-4-7zM12 13l8-9"/>',
};

export function icon(name, cls = '') {
  return `<svg class="svg-ic ${cls}" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${ICONS[name] || ''}</svg>`;
}
