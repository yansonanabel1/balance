import {fmtSleep, gx, esc} from '../ui.js';
import * as store from '../store.js';

export function sleepFromClock(start, end) {
  if (!/^\d{2}:\d{2}$/.test(start || '') || !/^\d{2}:\d{2}$/.test(end || '')) return null;
  const minute = (t) => {
    const h = Number(t.slice(0, 2)), m = Number(t.slice(3, 5));
    return h < 24 && m < 60 ? h * 60 + m : NaN;
  };
  const a = minute(start), b = minute(end);
  if (!Number.isFinite(a) || !Number.isFinite(b)) return null;
  const mins = (b - a + 1440) % 1440;
  return mins > 0 && mins <= 960 ? mins / 60 : null;
}
const hm = (v) => Math.floor(Math.round(v * 60) / 60) + ' ч ' + String(Math.round(v * 60) % 60).padStart(2,'0') + ' мин';
function parseDuration(text) {
  const t = String(text).trim().toLowerCase();
  const match = t.match(/^(\d{1,2})\s*(?::|ч[а-я.]*)\s*(\d{1,2})?\s*(?:м[а-я.]*)?$/);
  if (match) return Number(match[2] || 0) < 60 ? Number(match[1]) + Number(match[2] || 0) / 60 : null;
  const v = Number(t.replace(',', '.'));
  return t && Number.isFinite(v) ? v : null;
}
export function sleepBody(entry, mode) {
  const v = typeof entry.sleep === 'number' ? entry.sleep : 7;
  const actions = '<div class="checkin-foot"><button class="btn primary wide" data-act="next">Сохранить и продолжить</button>'
    + '<button class="link-btn" data-act="sleep-mode">' + (mode === 'clock' ? 'Указать только длительность' : 'Ввести время засыпания и пробуждения') + '</button>'
    + '<button class="link-btn" data-act="skip">Пропустить</button></div>';
  if (mode === 'clock') return '<h1 class="q">' + gx('Когда ты {заснула|заснул} и {проснулась|проснулся}?') + '</h1>'
    + '<p class="hint">Укажи время за прошедшую ночь. Продолжительность рассчитается автоматически, в том числе через полночь.</p>'
    + '<div class="sleep-times"><label class="sleep-time-label"><span>Заснула</span><input class="input" type="time" data-sleep="start" value="' + esc(entry.sleepStart || '') + '" aria-label="Время засыпания"></label>'
    + '<label class="sleep-time-label"><span>Проснулась</span><input class="input" type="time" data-sleep="end" value="' + esc(entry.sleepEnd || '') + '" aria-label="Время пробуждения"></label></div>'
    + '<div class="sleep-result" aria-live="polite"><span>Продолжительность сна</span><b data-sleep-duration>—</b></div>'
    + '<p class="hint small">Например, 23:30 → 07:00 = 7 ч 30 мин; 01:30 → 09:00 = 7 ч 30 мин.</p>'
    + '<p class="sleep-error" data-sleep-error role="status"></p>' + actions;
  return '<h1 class="q">Сколько часов сна было?</h1>'
    + '<p class="hint">Если время засыпания неизвестно, можно указать только длительность. Режим сна за этот день останется неизвестным.</p>'
    + '<div class="sleep-box"><button class="round" data-act="minus" aria-label="Меньше на 5 минут">−</button>'
    + '<label class="sleep-value"><input type="text" inputmode="decimal" value="' + fmtSleep(v) + '" aria-label="Часы сна, например 7:25 или 7,4"><small>ч</small></label>'
    + '<button class="round" data-act="plus" aria-label="Больше на 5 минут">+</button></div>'
    + '<p class="sleep-hm" aria-live="polite">' + hm(v) + '</p>'
    + '<input type="range" min="0" max="16" step="0.016666666666666666" value="' + v + '" aria-label="Часы сна">'
    + '<div class="range-legend"><span>0</span><span>8</span><span>16 ч</span></div>' + actions;
}
export function bindSleep(root, entry, mode, {save, next, setMode}) {
  root.querySelector('[data-act="sleep-mode"]').onclick = () => setMode(mode === 'clock' ? 'manual' : 'clock');
  if (mode === 'clock') {
    const start = root.querySelector('[data-sleep="start"]');
    const end = root.querySelector('[data-sleep="end"]');
    const label = root.querySelector('[data-sleep-duration]');
    const error = root.querySelector('[data-sleep-error]');
    const refresh = () => {
      const duration = sleepFromClock(start.value, end.value);
      label.textContent = duration === null ? '—' : hm(duration);
      error.textContent = '';
    };
    start.oninput = end.oninput = refresh;
    refresh();
    root.querySelector('[data-act="next"]').onclick = () => {
      const duration = sleepFromClock(start.value, end.value);
      if (duration === null) {
        error.textContent = 'Укажи оба времени. Продолжительность должна быть больше 0 и не более 16 часов.';
        return;
      }
      save({sleep:duration, sleepStart:start.value, sleepEnd:end.value});
      next();
    };
    return;
  }
  const range = root.querySelector('input[type="range"]');
  const field = root.querySelector('.sleep-value input');
  const result = root.querySelector('.sleep-hm');
  let value = typeof entry.sleep === 'number' ? entry.sleep : store.lastValue('sleep',entry.date) ?? 7;
  const set = (v, typing = false) => {
    value = Math.round(Math.min(16,Math.max(0,v)) * 60) / 60;
    range.value = value;
    if (!typing) field.value = fmtSleep(value);
    result.textContent = hm(value);
  };
  range.oninput = () => set(Number(range.value));
  field.oninput = () => {
    const v = parseDuration(field.value);
    if (v !== null && v >= 0 && v <= 16) set(v,true);
  };
  field.onblur = () => set(value);
  field.onfocus = () => field.select();
  root.querySelector('[data-act="minus"]').onclick = () => set(value - 5 / 60);
  root.querySelector('[data-act="plus"]').onclick = () => set(value + 5 / 60);
  root.querySelector('[data-act="next"]').onclick = () => {
    save({sleep:value, sleepStart:null, sleepEnd:null});
    next();
  };
}
