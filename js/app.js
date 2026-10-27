import * as store from './store.js';
import { icon, applyTheme } from './ui.js';
import * as today from './views/today.js';
import * as checkin from './views/checkin.js';
import * as diary from './views/diary.js';
import * as charts from './views/charts.js';
import * as breathe from './views/breathe.js';
import * as settings from './views/settings.js';
import * as practices from './views/practices.js';
import * as report from './views/report.js';
import * as importNotes from './views/import.js';
import * as feedback from './views/feedback.js';
import { startSync } from './sync.js';

const view = document.getElementById('view');
let cleanup = null;

// Маршруты: #/раздел/параметр/параметр
const ROUTES = {
  today: { tab: 'today', render: today.render },
  checkin: { tab: null, render: (root, [date, step]) => checkin.render(root, { date, step }) },
  diary: { tab: 'diary', render: diary.renderList },
  entry: { tab: 'diary', render: (root, [date]) => diary.renderEntry(root, { date }) },
  charts: { tab: 'charts', render: charts.render },
  breathe: { tab: 'practices', render: (root, [id]) => breathe.render(root, { id }) },
  practices: { tab: 'practices', render: practices.renderList },
  practice: { tab: 'practices', render: (root, [id]) => practices.renderPractice(root, { id }) },
  'practice-edit': { tab: 'practices', render: (root, [id]) => practices.renderEdit(root, { id }) },
  emotions: { tab: 'practices', render: practices.renderEmotions },
  report: { tab: null, render: report.render },
  import: { tab: 'settings', render: importNotes.render },
  feedback: { tab: 'settings', render: feedback.render },
  settings: { tab: 'settings', render: settings.render },
};

function route() {
  const [name, ...params] = location.hash.replace(/^#\/?/, '').split('/').map(decodeURIComponent);
  const r = ROUTES[name] || ROUTES.today;

  if (typeof cleanup === 'function') cleanup();
  cleanup = null;

  document.body.classList.toggle('no-tabbar', !r.tab);
  for (const a of document.querySelectorAll('.tabbar a')) {
    if (a.dataset.tab === r.tab) a.setAttribute('aria-current', 'page');
    else a.removeAttribute('aria-current');
  }

  view.innerHTML = '';
  cleanup = r.render(view, params) || null;
  window.scrollTo(0, 0);
  // перезапускаем анимацию появления
  view.classList.remove('enter');
  void view.offsetWidth;
  view.classList.add('enter');
}

for (const el of document.querySelectorAll('[data-icon]')) el.innerHTML = icon(el.dataset.icon);

applyTheme();
window.addEventListener('hashchange', route);
route();

// Данные могли поменяться в другой вкладке или в установленном приложении —
// перечитываем и перерисовываем экран. Посреди отметки и форм не трогаем, чтобы не сбить ввод.
function syncFromStorage() {
  if (!store.reload()) return;
  const name = location.hash.replace(/^#\/?/, '').split('/')[0];
  if (!['checkin', 'practice-edit', 'emotions', 'import', 'feedback'].includes(name)) route();
}
window.addEventListener('storage', (ev) => { if (ev.key === 'balance.v1') syncFromStorage(); });
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') syncFromStorage(); });
startSync();

// Android/Chrome отдаёт событие установки — сохраняем, чтобы показать свою кнопку «Установить»
window.addEventListener('beforeinstallprompt', (ev) => {
  ev.preventDefault();
  window.__installPrompt = ev;
});

// Просим браузер не удалять данные при нехватке места
navigator.storage?.persist?.().catch(() => {});

if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost' || location.hostname === '127.0.0.1')) {
  navigator.serviceWorker.register('sw.js').catch(() => {});
}
