import * as store from '../store.js';
import { art } from '../art.js';
import { EMOTIONS, esc, fmtDate, fmtNum, icon, plural, promptOfDay, scaleTone } from '../ui.js';

const STEPS = ['sleep', 'state', 'energy', 'anxiety', 'irritability', 'meds', 'feelings'];

const SCALES = {
  state: { title: 'Как ты себя чувствуешь?', hint: 'Общее состояние прямо сейчас', low: 'очень плохо', high: 'отлично' },
  energy: { title: 'Сколько у тебя энергии?', hint: 'Силы, желание что-то делать', low: 'совсем нет сил', high: 'через край' },
  anxiety: { title: 'Насколько сильна тревога?', hint: '1 — спокойно', low: 'спокойно', high: 'очень сильная', reversed: true },
  irritability: { title: 'А раздражительность?', hint: '1 — совсем нет', low: 'нет', high: 'очень сильная', reversed: true },
};

const MED_OPTIONS = [
  ['taken', 'Приняла'],
  ['missed', 'Пропустила'],
  ['none', 'Сегодня не нужно'],
];

export function render(root, { date, step }) {
  const day = store.isDateKey(date) ? date : store.dateKey();
  let i = Math.max(0, STEPS.indexOf(step === 'diary' ? 'feelings' : step));
  let dir = 'fwd';
  let saveTimer = null;

  const close = () => { location.hash = day === store.dateKey() ? '#/today' : `#/entry/${day}`; };
  const next = () => { dir = 'fwd'; i++; draw(); };
  const save = (patch) => store.saveEntry(day, patch);

  function draw() {
    if (i >= STEPS.length) return drawDone();
    const key = STEPS[i];
    const entry = store.getEntry(day) || {};
    const pct = Math.round(((i + 1) / STEPS.length) * 100);
    const isToday = day === store.dateKey();

    root.innerHTML = `
      <div class="checkin">
        <div class="checkin-top">
          <button class="icon-btn" data-act="back" aria-label="Назад">${icon('back')}</button>
          <div class="progress" role="progressbar" aria-valuenow="${pct}" aria-valuemin="0" aria-valuemax="100"><span style="width:${pct}%"></span></div>
          <button class="icon-btn" data-act="close" aria-label="Закрыть — ответы уже сохранены">${icon('close')}</button>
        </div>
        <p class="step-count"><span>${isToday ? 'Сегодня' : esc(fmtDate(day))}</span><span>${i + 1} из ${STEPS.length}</span></p>
        <div class="checkin-body ${dir}">${body(key, entry)}</div>
      </div>`;

    root.querySelector('[data-act="back"]').onclick = () => { if (i === 0) close(); else { dir = 'back'; i--; draw(); } };
    root.querySelector('[data-act="close"]').onclick = close;
    const skip = root.querySelector('[data-act="skip"]');
    if (skip) skip.onclick = () => { save({ [key]: null }); next(); };
    bind(key, entry);
  }

  function body(key, entry) {
    if (SCALES[key]) {
      const s = SCALES[key];
      const buttons = Array.from({ length: 10 }, (_, n) =>
        `<button type="button" data-v="${n + 1}" aria-pressed="${entry[key] === n + 1}" style="--tone:${scaleTone(n + 1, s.reversed)}">${n + 1}</button>`).join('');
      return `
        <h1 class="q">${s.title}</h1>
        <p class="hint">${s.hint}</p>
        <div class="scale" role="group" aria-label="${s.title}">${buttons}</div>
        <div class="scale-legend"><span>1 — ${s.low}</span><span>10 — ${s.high}</span></div>
        <div class="checkin-foot"><button class="link-btn" data-act="skip">Пропустить</button></div>`;
    }

    if (key === 'sleep') {
      const v = typeof entry.sleep === 'number' ? entry.sleep : store.lastValue('sleep', day) ?? 7;
      return `
        <h1 class="q">Сколько ты спала этой ночью?</h1>
        <p class="hint">Цифру можно взять из Mi Fitness / Zepp Life</p>
        <div class="sleep-art">${art('moon')}</div>
        <div class="sleep-box">
          <button class="round" data-act="minus" aria-label="Меньше на полчаса">−</button>
          <output aria-live="polite">${fmtNum(v)}<small> ч</small></output>
          <button class="round" data-act="plus" aria-label="Больше на полчаса">+</button>
        </div>
        <input type="range" min="0" max="14" step="0.5" value="${v}" aria-label="Часы сна">
        <div class="range-legend"><span>0</span><span>7</span><span>14 ч</span></div>
        <div class="checkin-foot">
          <button class="btn primary wide" data-act="next">Дальше</button>
          <button class="link-btn" data-act="skip">Пропустить</button>
        </div>`;
    }

    if (key === 'meds') {
      const cd = store.cycleDay(store.addDays(day, -1));
      const cycleHint = entry.periodStart ? 'Отмечен первый день цикла' : cd ? `Сегодня ${cd + 1}-й день цикла` : 'Отметь — и приложение будет считать день цикла';
      return `
        <h1 class="q">Лекарства и цикл</h1>
        <p class="hint">Как сегодня с приёмом?</p>
        <div class="choices">${MED_OPTIONS.map(([v, label]) => choice(v, label, entry.meds === v)).join('')}</div>
        <label class="switch-row">
          <span><b>Сегодня начались месячные</b><span class="cycle-hint">${cycleHint}</span></span>
          <span class="switch"><input type="checkbox" ${entry.periodStart ? 'checked' : ''}><i></i></span>
        </label>
        <div class="checkin-foot"><button class="btn primary wide" data-act="next">Дальше</button></div>`;
    }

    // feelings: эмоции + дневник
    const prompt = entry.prompt || promptOfDay(day);
    const chosen = new Set(entry.emotions || []);
    return `
      <h1 class="q">Что меня беспокоит?</h1>
      <p class="label">Какие чувства сейчас есть — можно несколько</p>
      <div class="emotions">
        ${EMOTIONS.map(([n, c]) => `<button type="button" class="emo" data-e="${n}" aria-pressed="${chosen.has(n)}"><i style="background:${c}"></i>${n}</button>`).join('')}
      </div>
      <div class="prompt-card bg-yellow on-pastel"><p class="eyebrow">Если не знаешь, с чего начать</p><p>${esc(prompt)}</p></div>
      <textarea aria-label="Что меня беспокоит?" placeholder="Пиши как есть — это только для тебя">${esc(entry.text || '')}</textarea>
      <div class="saved-note" aria-live="polite"></div>
      <div class="checkin-foot"><button class="btn primary wide" data-act="finish">Готово</button></div>`;
  }

  function choice(v, label, pressed) {
    return `<button type="button" class="choice" data-v="${v}" aria-pressed="${pressed}"><span class="mark">${pressed ? icon('check') : ''}</span>${label}</button>`;
  }

  function bind(key, entry) {
    if (SCALES[key]) {
      for (const b of root.querySelectorAll('.scale button')) {
        b.onclick = () => {
          root.querySelectorAll('.scale button').forEach((x) => x.setAttribute('aria-pressed', x === b));
          save({ [key]: Number(b.dataset.v) });
          navigator.vibrate?.(10);
          setTimeout(next, 260);
        };
      }
      return;
    }

    if (key === 'sleep') {
      const range = root.querySelector('input[type="range"]');
      const out = root.querySelector('output');
      const set = (v) => {
        v = Math.min(14, Math.max(0, v));
        range.value = v;
        out.innerHTML = `${fmtNum(v)}<small> ч</small>`;
      };
      range.oninput = () => set(Number(range.value));
      root.querySelector('[data-act="minus"]').onclick = () => set(Number(range.value) - 0.5);
      root.querySelector('[data-act="plus"]').onclick = () => set(Number(range.value) + 0.5);
      root.querySelector('[data-act="next"]').onclick = () => { save({ sleep: Number(range.value) }); next(); };
      return;
    }

    if (key === 'meds') {
      for (const b of root.querySelectorAll('.choice')) {
        b.onclick = () => {
          save({ meds: b.dataset.v });
          root.querySelectorAll('.choice').forEach((x) => {
            x.setAttribute('aria-pressed', x === b);
            x.querySelector('.mark').innerHTML = x === b ? icon('check') : '';
          });
        };
      }
      const sw = root.querySelector('.switch input');
      sw.onchange = () => {
        save({ periodStart: sw.checked });
        const cd = store.cycleDay(store.addDays(day, -1));
        root.querySelector('.cycle-hint').textContent = sw.checked ? 'Отмечен первый день цикла' : cd ? `Сегодня ${cd + 1}-й день цикла` : 'Отметь — и приложение будет считать день цикла';
      };
      root.querySelector('[data-act="next"]').onclick = next;
      return;
    }

    // feelings
    for (const b of root.querySelectorAll('.emo')) {
      b.onclick = () => {
        b.setAttribute('aria-pressed', b.getAttribute('aria-pressed') !== 'true');
        const emotions = [...root.querySelectorAll('.emo[aria-pressed="true"]')].map((x) => x.dataset.e);
        save({ emotions });
      };
    }

    // текст сохраняем по ходу набора, чтобы ничего не потерялось
    const ta = root.querySelector('textarea');
    const note = root.querySelector('.saved-note');
    const prompt = entry.prompt || promptOfDay(day);
    const flush = () => {
      clearTimeout(saveTimer);
      saveTimer = null;
      save({ text: ta.value.trim(), prompt });
      note.textContent = 'Сохранено';
    };
    ta.oninput = () => {
      note.textContent = '';
      clearTimeout(saveTimer);
      saveTimer = setTimeout(flush, 500);
    };
    root.querySelector('[data-act="finish"]').onclick = () => { flush(); next(); };
  }

  function drawDone() {
    const n = store.streak();
    root.innerHTML = `
      <div class="done-screen">
        ${art('sprout')}
        <span class="hand">ты молодец</span>
        <h1 class="display">Записано</h1>
        <p class="muted">${n > 1 ? `Уже ${n} ${plural(n, ['день', 'дня', 'дней'])} подряд. Маленькие отметки складываются в большую картину.` : 'Хорошее начало. Завтра — ещё одна маленькая отметка.'}</p>
        <div class="done-actions">
          <a class="btn primary" href="#/breathe/calm">Подышать 2 минуты</a>
          <a class="btn ghost" href="#/today">На главную</a>
        </div>
      </div>`;
  }

  draw();

  return () => {
    // если ушли со страницы посреди набора текста — дописываем
    const ta = root.querySelector('textarea');
    if (saveTimer && ta) store.saveEntry(day, { text: ta.value.trim(), prompt: store.getEntry(day)?.prompt || promptOfDay(day) });
    clearTimeout(saveTimer);
  };
}
