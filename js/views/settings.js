import * as store from '../store.js';
import { applyTheme, esc, icon, plural, toast } from '../ui.js';
import { art } from '../art.js';
import { isConfigured, pushAll, sendConfig, sendTest } from '../sync.js';

const hourOptions = (from, to, selected) => Array.from({ length: to - from + 1 }, (_, k) => from + k)
  .map((h) => `<option value="${h}" ${Number(selected) === h ? 'selected' : ''}>${String(h).padStart(2, '0')}:00</option>`).join('');

function backupNote(last) {
  if (!store.hasEntries()) return '';
  if (!last) return '<p class="note warn">Копия ещё ни разу не сохранялась.</p>';
  const days = store.daysBetween(last, store.dateKey());
  const when = days === 0 ? 'сегодня' : days === 1 ? 'вчера' : `${days} ${plural(days, ['день', 'дня', 'дней'])} назад`;
  return `<p class="note ${days > 14 ? 'warn' : ''}">Последняя копия: ${when}.</p>`;
}

const THEMES = [['auto', 'Как в системе'], ['light', 'Светлая'], ['dark', 'Тёмная']];

export function render(root) {
  const s = store.settings();

  root.innerHTML = `
    <header class="page-head"><h1 class="display">Настройки</h1></header>

    <section class="card">
      <h2 class="h2">Как к тебе обращаться</h2>
      <input class="input" data-f="name" style="margin-top:12px" placeholder="Имя" value="${esc(s.name || '')}" aria-label="Имя" autocomplete="given-name">
      <div class="seg" role="group" aria-label="Обращение" style="margin-top:12px">
        <button data-gender="f" aria-pressed="${s.gender !== 'm'}">в женском роде</button>
        <button data-gender="m" aria-pressed="${s.gender === 'm'}">в мужском роде</button>
      </div>
    </section>

    <section class="section card">
      <h2 class="h2">Тема</h2>
      <div class="seg" role="group" aria-label="Тема" style="margin-top:12px">
        ${THEMES.map(([v, l]) => `<button data-theme="${v}" aria-pressed="${s.theme === v}">${l}</button>`).join('')}
      </div>
    </section>

    <section class="section tile bg-blue on-pastel tg">
      <div class="tg-head"><div><p class="eyebrow muted">Напоминания</p><h3>Свой бот в Telegram</h3></div>${art('comma')}</div>
      <p class="muted small" style="margin:4px 0 14px">Если утренней отметки нет — бот напишет в Telegram, а отметки сохранятся в твою Google-таблицу. Это необязательно. Как подключить — в <a href="guide.html#bot">инструкции</a>.</p>
      <div class="list">
        <label class="field"><span class="label">Адрес веб-приложения Apps Script (…/exec)</span><input class="input" data-tg="url" inputmode="url" placeholder="https://script.google.com/macros/s/…/exec" value="${esc(s.tg.url)}"></label>
        <label class="field"><span class="label">Ключ (SECRET)</span><input class="input" data-tg="secret" type="password" autocomplete="off" value="${esc(s.tg.secret)}"></label>
        <div class="row-2">
          <label class="field"><span class="label">Утром в</span><select class="input" data-tg="morningHour">${hourOptions(5, 12, s.tg.morningHour)}</select></label>
          <label class="field"><span class="label">Повторно в</span><select class="input" data-tg="followUpHour"><option value="" ${s.tg.followUpHour == null || s.tg.followUpHour === '' ? 'selected' : ''}>не нужно</option>${hourOptions(10, 22, s.tg.followUpHour)}</select></label>
        </div>
        <label class="check"><input type="checkbox" data-tg="sendText" ${s.tg.sendText ? 'checked' : ''}> Сохранять в таблицу и тексты дневника</label>
        <button class="btn ink wide" data-act="tg-save">${icon('send')} Сохранить и проверить</button>
        <p class="status" aria-live="polite">${isConfigured() ? 'Подключено' : ''}</p>
      </div>
    </section>

    <section class="section card">
      <h2 class="h2">Кому позвонить, когда плохо</h2>
      <p class="note">Эти номера появятся по кнопке «Мне сейчас очень плохо». Добавь врача и близких.</p>
      <div class="list contacts" style="margin-top:14px"></div>
      <div class="actions" style="margin-top:12px">
        <button class="btn sm ghost" data-act="add">${icon('plus')} Добавить</button>
        <button class="btn sm primary" data-act="save-contacts">Сохранить</button>
      </div>
    </section>

    <section class="section card">
      <h2 class="h2">Резервная копия</h2>
      <p class="note">Записи хранятся на этом устройстве${isConfigured() ? ' и в твоей Google-таблице' : ''}. Время от времени сохраняй копию файлом.</p>
      ${backupNote(s.lastBackup)}
      <div class="actions">
        <a class="btn sm ink" href="#/import">Перенести старые заметки</a>
        <button class="btn sm primary" data-act="export">Скачать копию</button>
        <label class="btn sm ghost">Загрузить из файла<input type="file" accept="application/json,.json" hidden></label>
      </div>
    </section>

    <section class="section card" id="install">
      <h2 class="h2">Установить на телефон</h2>
      <ol class="steps">
        <li><b>Android (Chrome):</b> меню ⋮ → «Добавить на главный экран» или «Установить приложение».</li>
        <li><b>iPhone (Safari):</b> кнопка «Поделиться» → «На экран „Домой“».</li>
      </ol>
      <p class="note">Подробно, с картинками шагов, — в <a href="guide.html">инструкции</a>. Ей же можно поделиться с другом: у каждого свои записи, они хранятся только в его телефоне.</p>
    </section>

    <section class="section card">
      <h2 class="h2">Отзывы и идеи</h2>
      <p class="note">Что добавить, что мешает, что сломалось — напиши, и это учтут при доработке.</p>
      <a class="btn sm primary" style="margin-top:12px" href="#/feedback">${icon('send')} Написать отзыв</a>
    </section>

    <section class="section card">
      <h2 class="h2">Отчёт для врача</h2>
      <p class="note">Графики, сводка и таблица по дням за выбранный период — в PDF.</p>
      <a class="btn sm primary" style="margin-top:12px" href="#/report">${icon('print')} Сформировать отчёт</a>
    </section>
  `;

  const nameInput = root.querySelector('[data-f="name"]');
  nameInput.onchange = () => {
    store.updateSettings({ name: nameInput.value.trim() });
    toast('Имя сохранено');
  };

  for (const b of root.querySelectorAll('[data-gender]')) {
    b.onclick = () => {
      store.updateSettings({ gender: b.dataset.gender });
      root.querySelectorAll('[data-gender]').forEach((x) => x.setAttribute('aria-pressed', x === b));
      toast('Сохранено');
    };
  }

  for (const b of root.querySelectorAll('[data-theme]')) {
    b.onclick = () => {
      store.updateSettings({ theme: b.dataset.theme });
      applyTheme();
      root.querySelectorAll('[data-theme]').forEach((x) => x.setAttribute('aria-pressed', x === b));
    };
  }

  // --- свой Telegram-бот ---
  const status = root.querySelector('.status');
  root.querySelector('[data-act="tg-save"]').onclick = async (ev) => {
    const val = (k) => root.querySelector(`[data-tg="${k}"]`);
    const url = val('url').value.trim();
    const secret = val('secret').value.trim();
    // пустые поля — значит, отключить напоминания
    if (url && !/^https:\/\/script\.google(usercontent)?\.com\//.test(url)) {
      status.className = 'status err';
      status.textContent = 'Похоже, это не адрес Apps Script — он начинается с https://script.google.com/';
      return;
    }
    store.updateTg({
      url,
      secret,
      morningHour: Number(val('morningHour').value),
      followUpHour: val('followUpHour').value === '' ? null : Number(val('followUpHour').value),
      sendText: val('sendText').checked,
    });
    if (!isConfigured()) {
      status.className = 'status err';
      status.textContent = url || secret ? 'Впиши и URL, и ключ' : 'Напоминания отключены';
      return;
    }
    ev.target.disabled = true;
    status.className = 'status';
    status.textContent = 'Проверяю…';
    try {
      await sendConfig();
      await sendTest();
      const synced = await pushAll();
      status.className = 'status ok';
      status.textContent = synced ? 'Готово! Бот прислал тестовое сообщение, отметки отправлены в таблицу.' : 'Бот на связи, но часть отметок не ушла — попробую позже.';
    } catch (e) {
      status.className = 'status err';
      status.textContent = `Не получилось: ${e.message}. Проверь URL, ключ и что веб-приложение доступно «Всем».`;
    } finally {
      ev.target.disabled = false;
    }
  };

  // --- контакты ---
  const list = root.querySelector('.contacts');
  const row = (c = {}) => `
    <div class="contact-row">
      <input class="input" data-f="name" placeholder="Кто" value="${esc(c.name || '')}" aria-label="Имя">
      <input class="input" data-f="phone" placeholder="Телефон" inputmode="tel" value="${esc(c.phone || '')}" aria-label="Телефон">
      <button class="icon-btn" data-act="remove" aria-label="Удалить">${icon('close')}</button>
    </div>`;
  list.innerHTML = s.contacts.map(row).join('');
  list.onclick = (ev) => {
    const btn = ev.target.closest('[data-act="remove"]');
    if (btn) btn.closest('.contact-row').remove();
  };
  root.querySelector('[data-act="add"]').onclick = () => {
    list.insertAdjacentHTML('beforeend', row());
    list.lastElementChild.querySelector('input').focus();
  };
  root.querySelector('[data-act="save-contacts"]').onclick = () => {
    const contacts = [...list.querySelectorAll('.contact-row')]
      .map((r) => ({ name: r.querySelector('[data-f="name"]').value.trim(), phone: r.querySelector('[data-f="phone"]').value.trim() }))
      .filter((c) => c.phone);
    store.updateSettings({ contacts });
    toast('Контакты сохранены');
  };

  // --- резервная копия ---
  root.querySelector('[data-act="export"]').onclick = () => {
    const blob = new Blob([store.exportJSON()], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `balance-${store.dateKey()}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    store.updateSettings({ lastBackup: store.dateKey() });
    render(root);
  };
  root.querySelector('input[type="file"]').onchange = async (ev) => {
    const file = ev.target.files[0];
    if (!file) return;
    if (!confirm('Заменить все текущие записи данными из файла?')) return;
    try {
      store.importJSON(await file.text());
      applyTheme();
      toast('Данные загружены');
      render(root);
    } catch (e) {
      toast(`Не получилось: ${e.message}`);
    }
  };
}
