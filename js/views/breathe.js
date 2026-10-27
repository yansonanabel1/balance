import * as store from '../store.js';
import { art } from '../art.js';
import { esc, gx, icon } from '../ui.js';

// scale — размер шара в конце фазы (0.5 — выдохнуто, 1 — полный вдох); у задержки нет scale
const TECHNIQUES = [
  {
    id: 'calm', title: 'Спокойное дыхание', color: 'bg-blue', art: 'kite',
    short: 'Вдох 4 · выдох 6',
    about: 'Выдох длиннее вдоха включает «тормоз» нервной системы. Хорошо начинать с этой техники.',
    phases: [['Вдох', 4, 1], ['Выдох', 6, 0.5]],
  },
  {
    id: '478', title: '4-7-8', color: 'bg-green', art: 'moon',
    short: 'Вдох 4 · задержка 7 · выдох 8',
    about: 'Снижает тревогу и помогает уснуть. Вдох носом, выдох ртом с лёгким звуком. Если задержка тяжела — дыши медленнее, без напряжения.',
    phases: [['Вдох', 4, 1], ['Задержка', 7], ['Выдох', 8, 0.5]],
  },
  {
    id: 'box', title: 'Квадратное дыхание', color: 'bg-yellow', art: 'window',
    short: 'Вдох 4 · задержка 4 · выдох 4 · пауза 4',
    about: 'Ровный ритм возвращает ощущение контроля, когда мысли разгоняются.',
    phases: [['Вдох', 4, 1], ['Задержка', 4], ['Выдох', 4, 0.5], ['Пауза', 4]],
  },
  {
    id: 'sigh', title: 'Физиологический вздох', color: 'bg-pink', art: 'balloon',
    short: 'Двойной вдох носом · долгий выдох',
    about: 'Самый быстрый способ сбросить острое напряжение: глубокий вдох, короткий добор воздуха и медленный выдох ртом.',
    phases: [['Вдох', 2, 0.85], ['Ещё вдох', 1, 1], ['Долгий выдох', 6, 0.5]],
  },
];

const DURATIONS = [1, 3, 5];
let minutes = 3;

const ease = (f) => (1 - Math.cos(Math.PI * f)) / 2;
const cycleSecs = (t) => t.phases.reduce((s, p) => s + p[1], 0);

// Уровень вдоха (0.5…1) через elapsed секунд от начала цикла
function levelAt(tech, elapsed) {
  let level = 0.5;
  let t = 0;
  for (const [, secs, scale] of tech.phases) {
    const target = scale ?? level;
    if (elapsed <= t + secs) return level + (target - level) * ease((elapsed - t) / secs);
    t += secs;
    level = target;
  }
  return level;
}

// Волна одного цикла: по ней бежит точка, как в дыхательных практиках референса
function wave(tech, w, h, pad = 7) {
  const total = cycleSecs(tech);
  const pts = [];
  for (let s = 0; s <= 120; s++) {
    const el = (s / 120) * total;
    pts.push(point(tech, el, w, h, pad));
  }
  return pts.map(([x, y], k) => `${k ? 'L' : 'M'}${x.toFixed(1)},${y.toFixed(1)}`).join('');
}

function point(tech, elapsed, w, h, pad = 7) {
  const total = cycleSecs(tech);
  const x = pad + (elapsed / total) * (w - 2 * pad);
  const y = pad + (1 - (levelAt(tech, elapsed) - 0.5) / 0.5) * (h - 2 * pad);
  return [x, y];
}

export function render(root, { id }) {
  const tech = TECHNIQUES.find((t) => t.id === id);
  if (!tech) return renderList(root);
  return renderSession(root, tech);
}

function renderList(root) {
  root.innerHTML = `
    <header class="page-head"><p class="eyebrow">Когда тревожно или не уснуть</p><h1 class="display">Дыхание</h1></header>
    <div class="tech-list">
      ${TECHNIQUES.map((t) => {
        const d = wave(t, 220, 44);
        return `
        <a class="tile tech ${t.color}" href="#/breathe/${t.id}">
          <div>
            <h3>${t.title}</h3>
            <p class="pattern">${t.short}</p>
            <div class="wave"><svg viewBox="0 0 220 44" aria-hidden="true">
              <path d="${d}"/>
              <circle r="4.5"><animateMotion dur="${cycleSecs(t)}s" repeatCount="indefinite" path="${d}"/></circle>
            </svg></div>
          </div>
          ${art(t.art)}
        </a>`;
      }).join('')}
    </div>
    <p class="note" style="margin-top:20px">Если кружится голова — вернись к обычному дыханию. Это нормально, особенно в начале.</p>`;
}

function renderSession(root, tech) {
  const WW = 320, WH = 70;
  root.innerHTML = `
    <div class="breathe">
      <div class="detail-head">
        <a class="icon-btn" href="#/breathe" aria-label="Все техники">${icon('back')}</a>
        <h1 class="h2">${esc(tech.title)}</h1>
        <span style="width:44px"></span>
      </div>
      <div class="orb-wrap">
        <div class="orb-ring"></div>
        <div class="orb t-${tech.id}"></div>
        <div class="orb-label" aria-live="polite"><span class="phase">${gx('{Готова|Готов}?')}</span><span class="count"></span></div>
      </div>
      <div class="wave wave-big ${tech.color}"><svg viewBox="0 0 ${WW} ${WH}" aria-hidden="true">
        <path d="${wave(tech, WW, WH)}"/>
        <circle r="6" cx="${point(tech, 0, WW, WH)[0]}" cy="${point(tech, 0, WW, WH)[1]}"/>
      </svg></div>
      <p class="about muted small">${esc(tech.about)}</p>
      <div class="controls">
        <div class="seg" role="group" aria-label="Длительность">
          ${DURATIONS.map((m) => `<button data-m="${m}" aria-pressed="${m === minutes}">${m} мин</button>`).join('')}
        </div>
        <button class="btn primary wide" data-act="toggle">Начать</button>
        <div class="remaining"></div>
      </div>
    </div>`;

  const orb = root.querySelector('.orb');
  const dot = root.querySelector('.wave-big circle');
  const phaseEl = root.querySelector('.phase');
  const countEl = root.querySelector('.count');
  const toggle = root.querySelector('[data-act="toggle"]');
  const remainingEl = root.querySelector('.remaining');
  const segButtons = root.querySelectorAll('.seg button');

  let timer = null;
  let raf = null;
  let running = false;
  let phaseIdx = 0;
  let phaseLeft = 0;
  let phaseStart = 0;
  let totalLeft = 0;
  let doneSecs = 0;
  let wakeLock = null;

  const fmtLeft = (s) => `Осталось ${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
  const phaseOffset = () => tech.phases.slice(0, phaseIdx).reduce((s, p) => s + p[1], 0);

  function moveDot() {
    const secs = tech.phases[phaseIdx][1];
    const el = phaseOffset() + Math.min(secs, (performance.now() - phaseStart) / 1000);
    const [x, y] = point(tech, el, WW, WH);
    dot.setAttribute('cx', x);
    dot.setAttribute('cy', y);
    if (running) raf = requestAnimationFrame(moveDot);
  }

  function startPhase() {
    const [label, secs, scale] = tech.phases[phaseIdx];
    phaseLeft = secs;
    phaseStart = performance.now();
    phaseEl.textContent = label;
    countEl.textContent = secs;
    if (scale != null) {
      orb.style.transitionDuration = `${secs}s`;
      orb.style.transform = `scale(${scale})`;
    }
    navigator.vibrate?.(25);
  }

  function tick() {
    phaseLeft--;
    doneSecs++;
    totalLeft = Math.max(0, totalLeft - 1);
    remainingEl.textContent = fmtLeft(totalLeft);
    if (phaseLeft > 0) {
      countEl.textContent = phaseLeft;
      return;
    }
    phaseIdx = (phaseIdx + 1) % tech.phases.length;
    // заканчиваем только после полного цикла, чтобы не оборвать на вдохе
    if (phaseIdx === 0 && totalLeft === 0) return finish();
    startPhase();
  }

  async function start() {
    running = true;
    toggle.textContent = 'Пауза';
    segButtons.forEach((b) => (b.disabled = true));
    if (totalLeft === 0) {
      totalLeft = minutes * 60;
      phaseIdx = 0;
    }
    remainingEl.textContent = fmtLeft(totalLeft);
    startPhase();
    timer = setInterval(tick, 1000);
    raf = requestAnimationFrame(moveDot);
    try { wakeLock = await navigator.wakeLock?.request('screen'); } catch {}
  }

  function stopLoops() {
    running = false;
    clearInterval(timer);
    cancelAnimationFrame(raf);
  }

  function pause() {
    stopLoops();
    toggle.textContent = 'Продолжить';
    phaseEl.textContent = 'Пауза';
    countEl.textContent = '';
    // замираем там, где сейчас шар
    orb.style.transform = getComputedStyle(orb).transform;
    orb.style.transitionDuration = '0s';
    releaseWakeLock();
  }

  function finish() {
    stopLoops();
    totalLeft = 0;
    phaseEl.textContent = 'Готово';
    countEl.textContent = '';
    remainingEl.textContent = 'Заметь, как ты себя чувствуешь сейчас';
    toggle.textContent = 'Ещё раз';
    segButtons.forEach((b) => (b.disabled = false));
    orb.style.transitionDuration = '2s';
    orb.style.transform = 'scale(.5)';
    navigator.vibrate?.([40, 60, 40]);
    flushLog();
    releaseWakeLock();
  }

  // минуты дыхания попадают в «План на сегодня»
  function flushLog() {
    if (doneSecs > 0) store.addBreathSeconds(store.dateKey(), doneSecs);
    doneSecs = 0;
  }

  function releaseWakeLock() {
    wakeLock?.release?.().catch(() => {});
    wakeLock = null;
  }

  toggle.onclick = () => (running ? pause() : start());
  for (const b of segButtons) {
    b.onclick = () => {
      minutes = Number(b.dataset.m);
      totalLeft = 0;
      segButtons.forEach((x) => x.setAttribute('aria-pressed', x === b));
    };
  }

  return () => {
    stopLoops();
    flushLog();
    releaseWakeLock();
  };
}
