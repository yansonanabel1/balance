import * as store from '../store.js';
import { art } from '../art.js';
import { esc, fmtDate, greeting, gx, icon, metricChips, plural, stateColor } from '../ui.js';
import { find as findPractice } from './practices.js';

export function render(root) {
  const today = store.dateKey();
  const entry = store.getEntry(today);
  const name = store.settings().name;
  const n = store.streak();

  root.innerHTML = `
    <header class="page-head greet">
      <div>
        <p class="eyebrow">${esc(fmtDate(today))}</p>
        <h1 class="display">${greeting()},<br><em>${name ? `${esc(name)}!` : 'как ты?'}</em></h1>
      </div>
    </header>

    ${entry && hasMetrics(entry) ? summary(entry) : cta(today)}

    <section class="section">
      <div class="section-title"><h2 class="h2">План на сегодня</h2><span class="hand">шаг за шагом</span></div>
      ${plan(today, entry)}
    </section>

    <section class="section card">
      <div class="streak">
        <div><p class="eyebrow">Дней подряд</p><b>${n} ${plural(n, ['день', 'дня', 'дней'])}</b></div>
        <a class="btn sm ghost" href="#/charts">Графики</a>
      </div>
      ${week(today)}
    </section>

    <section class="section">
      <div class="section-title"><h2 class="h2">Успокоиться</h2><span class="spacer"></span><a href="#/breathe">Все техники</a></div>
      <div class="tiles">
        <a class="tile bg-blue" href="#/breathe/calm"><h3>Спокойное дыхание</h3><p class="muted">Вдох 4 · выдох 6</p>${art('kite')}</a>
        <a class="tile bg-lilac" href="#/breathe/478"><h3>4-7-8</h3><p class="muted">Снять тревогу, уснуть</p>${art('moon')}</a>
      </div>
    </section>

    ${installCard()}

    <button class="crisis-btn" data-act="crisis">${icon('heart')} Мне сейчас очень плохо</button>
  `;

  root.querySelector('[data-act="crisis"]').onclick = openCrisis;

  const install = root.querySelector('[data-act="install"]');
  if (install) {
    install.onclick = async () => {
      const ev = window.__installPrompt;
      if (!ev) return (location.hash = '#/settings');
      ev.prompt();
      await ev.userChoice.catch(() => {});
      window.__installPrompt = null;
      render(root);
    };
    root.querySelector('[data-act="hide-install"]').onclick = () => {
      store.updateSettings({ installHintHidden: true });
      render(root);
    };
  }
}

function hasMetrics(e) {
  return ['sleep', 'state', 'energy', 'anxiety', 'irritability'].some((k) => typeof e[k] === 'number');
}

function cta(today) {
  return `
    <section class="tile hero bg-yellow on-pastel">
      <div>
        <p class="eyebrow muted">Утренняя отметка</p>
        <h2>Как ты сегодня?</h2>
        <p class="muted">Сон, состояние, энергия и пара строк — минуты две.</p>
        <a class="btn ink" href="#/checkin/${today}">Начать</a>
      </div>
      ${art('sunrise')}
    </section>`;
}

function summary(e) {
  return `
    <section class="tile hero bg-green on-pastel">
      <div>
        <p class="eyebrow muted">Сегодня отмечено</p>
        <h2>${e.text ? 'Отметка сделана' : 'Почти готово'}</h2>
        <div class="chips">${metricChips(e)}</div>
        <div class="row">
          <a class="btn sm ink" href="#/checkin/${e.date}">${icon('edit')} Изменить</a>
        </div>
      </div>
      ${art('sprout')}
    </section>`;
}

function plan(today, e) {
  const breath = store.getLog(today).breathSecs || 0;
  const items = [
    {
      done: !!e && hasMetrics(e),
      title: 'Утренняя отметка',
      sub: 'Сон, состояние, энергия',
      href: `#/checkin/${today}`,
    },
    {
      done: !!e?.text,
      title: 'Что меня беспокоит?',
      sub: e?.emotions?.length ? e.emotions.slice(0, 3).join(', ') : 'Пара строк в дневник',
      href: `#/checkin/${today}/feelings`,
    },
    {
      done: breath >= 60,
      title: 'Подышать',
      sub: breath >= 60 ? `${Math.round(breath / 60)} мин сегодня` : '2–3 минуты, чтобы замедлиться',
      href: '#/breathe/calm',
    },
  ];
  return `<div class="plan">${items.map((it) => `
    <a class="plan-item ${it.done ? 'done' : ''}" href="${it.href}">
      <span class="plan-dot">${it.done ? icon('check') : ''}</span>
      <span class="plan-card"><span><b>${it.title}</b><span>${esc(it.sub)}</span></span><span class="go">${icon('next')}</span></span>
    </a>`).join('')}</div>`;
}

function week(today) {
  const cells = [];
  for (let k = 6; k >= 0; k--) {
    const d = store.addDays(today, -k);
    const e = store.getEntry(d);
    const c = stateColor(e?.state);
    const label = store.parseKey(d).toLocaleDateString('ru-RU', { weekday: 'short' });
    cells.push(`
      <a href="${e ? `#/entry/${d}` : `#/checkin/${d}`}" class="${d === today ? 'today' : ''}" aria-label="${esc(fmtDate(d))}${e?.state ? `, состояние ${e.state}` : e ? ', есть запись' : ', нет записи — заполнить'}">
        <div class="d">${label}</div>
        <div class="dot ${c || e ? 'filled' : ''}" style="${c ? `background:${c}` : e ? 'background:var(--surface-2);color:var(--text)' : ''}">${e?.state ?? (e ? '·' : '')}</div>
      </a>`);
  }
  return `<div class="week">${cells.join('')}</div>`;
}

function installCard() {
  const standalone = matchMedia('(display-mode: standalone)').matches || navigator.standalone;
  if (standalone || store.settings().installHintHidden) return '';
  return `
    <section class="section tile bg-peach on-pastel install">
      <div>
        <h3>Поставь на главный экран</h3>
        <p class="muted">Так приложение открывается одним касанием, как обычное, и работает без интернета.</p>
        <div class="row">
          <button class="btn sm ink" data-act="install">${window.__installPrompt ? 'Установить' : 'Как это сделать'}</button>
          <button class="link-btn" data-act="hide-install">Скрыть</button>
        </div>
      </div>
      ${art('phone')}
    </section>`;
}

export function openCrisis() {
  const dlg = document.getElementById('crisis');
  const contacts = store.settings().contacts.filter((c) => c.phone);
  dlg.innerHTML = `
    <div class="grab"></div>
    ${art('candle')}
    <h2 id="crisis-title">${gx('Ты не {одна|один}')}</h2>
    <p class="lead muted">Это состояние пройдёт. Сначала — несколько медленных выдохов, длиннее вдоха.</p>
    <a class="btn primary wide" href="#/breathe/calm" data-close>Подышать вместе</a>
    <p class="eyebrow" style="margin:22px 0 8px">Быстро вернуться в тело</p>
    <div class="list">
      <a class="contact-link" href="#/practice/cold" data-close><span>Холодная вода и лёд</span><span>${icon('next')}</span></a>
      <a class="contact-link" href="#/practice/grounding" data-close><span>Заземление 5-4-3-2-1</span><span>${icon('next')}</span></a>
      ${findPractice('anchor') ? `<a class="contact-link" href="#/practice/anchor" data-close><span>${esc(findPractice('anchor').title)}</span><span>${icon('next')}</span></a>` : ''}
    </div>
    <p class="eyebrow" style="margin:22px 0 8px">Позвонить</p>
    <div class="list">
      ${contacts.map((c) => `<a class="contact-link" href="tel:${esc(c.phone.replace(/[^\d+]/g, ''))}"><span>${esc(c.name || c.phone)}</span><span>${esc(c.phone)}</span></a>`).join('')}
    </div>
    <p class="note">Если есть риск, что ты причинишь себе вред, звони 112. Врача и близких можно добавить в <a href="#/settings" data-close>настройках</a>.</p>
    <button class="btn ghost wide" style="margin-top:16px" data-close>Закрыть</button>
  `;
  for (const el of dlg.querySelectorAll('[data-close]')) el.addEventListener('click', () => dlg.close());
  // закрытие по тапу на затемнение
  dlg.onclick = (ev) => {
    const r = dlg.getBoundingClientRect();
    if (ev.target === dlg && (ev.clientY < r.top || ev.clientY > r.bottom || ev.clientX < r.left || ev.clientX > r.right)) dlg.close();
  };
  dlg.showModal();
}
