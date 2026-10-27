// Хранилище: всё лежит в localStorage этого устройства.
// Запись = один день: { date, sleep, state, energy, anxiety, irritability, meds, periodStart, emotions, text, prompt }

const KEY = 'balance.v1';
const DEFAULT_SETTINGS = {
  theme: 'auto',
  name: '',
  // род обращения в текстах: 'f' — женский, 'm' — мужской
  gender: 'f',
  contacts: [{ name: 'Экстренные службы', phone: '112' }],
  lastBackup: null,
  installHintHidden: false,
  // Telegram-напоминания через свой бот (Apps Script)
  tg: { url: '', secret: '', morningHour: 9, followUpHour: 13, sendText: false },
};

// Кто хочет знать об изменении записи дня (синхронизация с таблицей)
const entryListeners = [];
export function onEntryChange(fn) {
  entryListeners.push(fn);
}
const notify = (date) => entryListeners.forEach((fn) => fn(date));

let state = load();

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return normalize(JSON.parse(raw));
  } catch {}
  return normalize({});
}

function normalize(s) {
  const entries = s && s.entries && typeof s.entries === 'object' ? s.entries : {};
  // log — то, что не является отметкой дня (например, минуты дыхания), чтобы не создавать «пустых» записей
  const log = s && s.log && typeof s.log === 'object' ? s.log : {};
  const obj = (k) => (s && s[k] && typeof s[k] === 'object' ? s[k] : {});
  return {
    entries,
    log,
    // practices: { [id]: { fav, tries: [{ date, rating }] } }; custom — свои практики; emotionMap — «эмоции в теле»
    practices: obj('practices'),
    custom: Array.isArray(s?.custom) ? s.custom : [],
    emotionMap: obj('emotionMap'),
    pending: Array.isArray(s?.pending) ? s.pending : [],
    settings: { ...DEFAULT_SETTINGS, ...(s && s.settings), tg: { ...DEFAULT_SETTINGS.tg, ...(s?.settings?.tg) } },
  };
}

// Приложение может быть открыто в двух местах (вкладка браузера и установленное приложение).
// Перед каждым изменением перечитываем хранилище, чтобы не затереть чужие свежие записи.
let lastRaw = readRaw();

function readRaw() {
  try {
    return localStorage.getItem(KEY);
  } catch {
    return null;
  }
}

function fresh() {
  const raw = readRaw();
  if (raw === lastRaw) return false;
  state = load();
  lastRaw = raw;
  return true;
}

// true — данные изменились снаружи и экран стоит перерисовать
export function reload() {
  return fresh();
}

function persist() {
  try {
    const raw = JSON.stringify(state);
    localStorage.setItem(KEY, raw);
    lastRaw = raw;
    return true;
  } catch {
    return false;
  }
}

// ---- даты (ключ дня — YYYY-MM-DD по местному времени) ----

export function dateKey(d = new Date()) {
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
}

export function parseKey(k) {
  const [y, m, d] = k.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function addDays(k, n) {
  const d = parseKey(k);
  d.setDate(d.getDate() + n);
  return dateKey(d);
}

export function daysBetween(a, b) {
  return Math.round((parseKey(b) - parseKey(a)) / 864e5);
}

export function isDateKey(k) {
  return /^\d{4}-\d{2}-\d{2}$/.test(k || '');
}

// ---- записи ----

export function getEntry(date) {
  return state.entries[date] || null;
}

export function saveEntry(date, patch) {
  fresh();
  const prev = state.entries[date];
  const now = Date.now();
  state.entries[date] = { ...prev, ...patch, date, createdAt: prev?.createdAt || now, updatedAt: now };
  const ok = persist();
  notify(date);
  return ok;
}

export function deleteEntry(date) {
  fresh();
  delete state.entries[date];
  const ok = persist();
  notify(date);
  return ok;
}

export function allEntries() {
  return Object.values(state.entries).sort((a, b) => b.date.localeCompare(a.date));
}

export function hasEntries() {
  return Object.keys(state.entries).length > 0;
}

// Последнее известное значение поля до указанного дня (для подстановки по умолчанию)
export function lastValue(field, beforeDate) {
  const e = allEntries().find((x) => x.date < beforeDate && typeof x[field] === 'number');
  return e ? e[field] : null;
}

// Сколько дней подряд есть отметки (сегодня ещё можно не успеть — тогда считаем со вчера)
export function streak() {
  let k = dateKey();
  if (!state.entries[k]) k = addDays(k, -1);
  let n = 0;
  while (state.entries[k]) {
    n++;
    k = addDays(k, -1);
  }
  return n;
}

// День цикла на дату — от последней отметки «начались месячные»
export function cycleDay(date) {
  let start = null;
  for (const e of Object.values(state.entries)) {
    if (e.periodStart && e.date <= date && (!start || e.date > start)) start = e.date;
  }
  if (!start) return null;
  const n = daysBetween(start, date) + 1;
  return n <= 60 ? n : null;
}

// ---- журнал активностей ----

export function getLog(date) {
  return state.log[date] || {};
}

export function addBreathSeconds(date, secs) {
  fresh();
  const prev = state.log[date] || {};
  state.log[date] = { ...prev, breathSecs: (prev.breathSecs || 0) + secs };
  return persist();
}

// ---- практики ----

export function practiceState(id) {
  return state.practices[id] || { fav: false, tries: [] };
}

export function toggleFavorite(id) {
  fresh();
  const p = practiceState(id);
  state.practices[id] = { ...p, fav: !p.fav };
  persist();
  return !p.fav;
}

export function addPracticeTry(id, rating) {
  fresh();
  const p = practiceState(id);
  state.practices[id] = { ...p, tries: [...p.tries, { date: dateKey(), rating }] };
  return persist();
}

export function customPractices() {
  return state.custom;
}

export function saveCustomPractice(p) {
  fresh();
  const i = state.custom.findIndex((x) => x.id === p.id);
  if (i >= 0) state.custom[i] = p;
  else state.custom.push(p);
  return persist();
}

export function deleteCustomPractice(id) {
  fresh();
  state.custom = state.custom.filter((x) => x.id !== id);
  delete state.practices[id];
  return persist();
}

// ---- эмоции в теле (свои наблюдения по каждой эмоции) ----

export function emotionNote(name) {
  return state.emotionMap[name] || {};
}

export function saveEmotionNote(name, patch) {
  fresh();
  state.emotionMap[name] = { ...emotionNote(name), ...patch };
  return persist();
}

// ---- очередь синхронизации с таблицей ----

export function pendingDates() {
  return state.pending;
}

export function setPending(dates) {
  fresh();
  state.pending = [...new Set(dates)];
  return persist();
}

// ---- настройки ----

export function settings() {
  return state.settings;
}

export function updateTg(patch) {
  fresh();
  state.settings = { ...state.settings, tg: { ...state.settings.tg, ...patch } };
  return persist();
}

export function updateSettings(patch) {
  fresh();
  state.settings = { ...state.settings, ...patch };
  return persist();
}

// ---- резервная копия ----

export function exportJSON() {
  return JSON.stringify({ app: 'balance', version: 1, exportedAt: new Date().toISOString(), ...state }, null, 2);
}

export function importJSON(text) {
  const data = JSON.parse(text);
  if (!data || typeof data.entries !== 'object') throw new Error('В файле нет записей');
  state = normalize(data);
  return persist();
}
