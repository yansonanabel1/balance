import * as store from '../store.js';
import { art } from '../art.js';
import { APP_VERSION, FEEDBACK_URL } from '../config.js';
import { esc, icon, toast } from '../ui.js';

const TYPES = [
  ['idea', '💡 Идея'],
  ['bug', '🐞 Ошибка'],
  ['ux', '🤔 Неудобно'],
  ['other', '✉️ Другое'],
];

function device() {
  const ua = navigator.userAgent;
  const os = /Android/i.test(ua) ? 'Android' : /iPhone|iPad/i.test(ua) ? 'iOS' : 'компьютер';
  const installed = matchMedia('(display-mode: standalone)').matches || navigator.standalone;
  return `версия ${APP_VERSION} · ${os} · ${installed ? 'установлено' : 'в браузере'}`;
}

export function render(root) {
  const name = store.settings().name;
  let type = 'idea';

  root.innerHTML = `
    <div class="detail-head"><a class="icon-btn" href="#/settings" aria-label="Назад">${icon('back')}</a></div>
    <header class="page-head"><span class="hand">сделаем лучше</span><h1 class="display">Отзывы и идеи</h1></header>
    <p class="muted" style="margin-top:-8px">Что добавить, что мешает, что сломалось — напиши как есть. Сообщение придёт автору приложения.</p>
    ${FEEDBACK_URL ? '' : '<p class="note warn">Отправка отзывов пока не подключена.</p>'}
    <form class="card list" data-form>
      <div class="filters" role="group" aria-label="Тип отзыва" style="margin:0 -20px;padding:2px 20px 6px">
        ${TYPES.map(([v, l]) => `<button type="button" data-type="${v}" aria-pressed="${v === type}">${l}</button>`).join('')}
      </div>
      <label class="field"><span class="label">Сообщение</span><textarea name="text" required maxlength="2000" placeholder="Например: хочу отмечать сон отдельно днём и ночью"></textarea></label>
      <label class="field"><span class="label">Как тебя зовут (необязательно)</span><input class="input" name="name" maxlength="60" value="${esc(name || '')}"></label>
      <label class="field"><span class="label">Как с тобой связаться, если будут вопросы (необязательно)</span><input class="input" name="contact" maxlength="100" placeholder="@ник в Telegram"></label>
      <p class="note" style="margin:0">Вместе с отзывом уйдёт только техническое: ${esc(device())}. Твои записи никуда не отправляются.</p>
      <button class="btn primary wide" type="submit" ${FEEDBACK_URL ? '' : 'disabled'}>Отправить</button>
    </form>`;

  for (const b of root.querySelectorAll('[data-type]')) {
    b.onclick = () => {
      type = b.dataset.type;
      root.querySelectorAll('[data-type]').forEach((x) => x.setAttribute('aria-pressed', x === b));
    };
  }

  const form = root.querySelector('[data-form]');
  form.onsubmit = async (ev) => {
    ev.preventDefault();
    const f = new FormData(form);
    const text = String(f.get('text') || '').trim();
    if (!text) return;
    const btn = form.querySelector('[type="submit"]');
    btn.disabled = true;
    btn.textContent = 'Отправляю…';
    try {
      const res = await fetch(FEEDBACK_URL, {
        method: 'POST',
        // text/plain — «простой» запрос без preflight, Apps Script такой принимает
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({
          source: 'balance', action: 'feedback', type, text,
          name: String(f.get('name') || '').trim(),
          contact: String(f.get('contact') || '').trim(),
          meta: device(),
        }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || 'не получилось');
      root.innerHTML = `
        <div class="done-screen">
          ${art('sprout')}
          <span class="hand">спасибо!</span>
          <h1 class="display">Отзыв отправлен</h1>
          <p class="muted">Каждое сообщение читается — так приложение и становится удобнее.</p>
          <div class="done-actions"><a class="btn primary" href="#/today">На главную</a></div>
        </div>`;
    } catch (e) {
      toast(navigator.onLine ? `Не отправилось: ${e.message}` : 'Нет интернета — попробуй позже');
      btn.disabled = false;
      btn.textContent = 'Отправить';
    }
  };
}
