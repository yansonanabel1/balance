// Связь с Жориком (DariaAssistant, Balance.gs): отметки уходят в его Web App → лист BALANCE,
// а Жорик по расписанию напоминает в Telegram, если отметки за день нет.
import * as store from './store.js';

let timer = null;

function cfg() {
  return store.settings().tg;
}

export function isConfigured() {
  const c = cfg();
  return !!(c.url && c.secret);
}

// text/plain — «простой» запрос без preflight, Apps Script такой принимает
export async function call(payload) {
  const c = cfg();
  const res = await fetch(c.url, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    // source: 'balance' — по нему doPost Жорика отличает нас от Telegram webhook
    body: JSON.stringify({ ...payload, source: 'balance', secret: c.secret }),
  });
  const data = await res.json();
  if (!data.ok) throw new Error(data.error || 'ошибка скрипта');
  return data;
}

function payloadFor(date) {
  const e = store.getEntry(date);
  if (!e) return { date, deleted: true };
  const { createdAt, updatedAt, prompt, ...rest } = e;
  if (!cfg().sendText) delete rest.text;
  return rest;
}

export async function flush() {
  if (!isConfigured() || !navigator.onLine) return;
  const dates = store.pendingDates();
  if (!dates.length) return;
  try {
    await call({ action: 'entries', entries: dates.map(payloadFor) });
    // за время запроса могли появиться новые изменения — убираем только отправленные
    store.setPending(store.pendingDates().filter((d) => !dates.includes(d)));
  } catch {
    // не вышло — попробуем при следующем изменении или когда появится сеть
  }
}

function schedule() {
  clearTimeout(timer);
  timer = setTimeout(flush, 2500);
}

export function startSync() {
  store.onEntryChange((date) => {
    if (!isConfigured()) return;
    store.setPending([...store.pendingDates(), date]);
    schedule();
  });
  window.addEventListener('online', flush);
  flush();
}

// Отправить всё, что есть (после первой настройки)
export async function pushAll() {
  store.setPending(store.allEntries().map((e) => e.date));
  await flush();
  return store.pendingDates().length === 0;
}

export function sendConfig() {
  const c = cfg();
  const appUrl = location.href.split('#')[0];
  return call({
    action: 'config',
    config: { morningHour: Number(c.morningHour), followUpHour: c.followUpHour === '' || c.followUpHour == null ? null : Number(c.followUpHour), appUrl },
  });
}

export function sendTest() {
  return call({ action: 'test' });
}
