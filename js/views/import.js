import * as store from '../store.js';
import { art } from '../art.js';
import { esc, fmtShort, icon, metricChips, plural, toast } from '../ui.js';

// Импорт старых заметок: текст делится на записи по датам в начале строки.
// Даты: 26.10, 26.10.2026, 26/10/26, 2026-10-26, «26 октября», «26 окт 2026».

const MONTHS = ['янв', 'фев', 'мар', 'апр', 'мая|май', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек'];
const MONTH_RE = MONTHS.map((m) => `(?:${m})[а-я]*`).join('|');

const DATE_PATTERNS = [
  // 2026-10-26
  { re: /^\s*(\d{4})-(\d{1,2})-(\d{1,2})\b/, pick: (m) => [m[1], m[2], m[3]] },
  // 20-22.10 — запись за несколько дней: кладём на первый день и помечаем диапазон
  {
    re: /^\s*(\d{1,2})\s*[-–—]\s*(\d{1,2})[./](\d{1,2})(?:[./](\d{2,4}))?(?!\d)/,
    pick: (m) => [m[4], m[3], m[1]],
    label: (m) => `${m[1]}–${m[2]}.${m[3]}`,
  },
  // 26.10 / 26.10.2026 / 26/10/26. Без года текст в той же строке разрешаем, только если
  // месяц двузначный («24.10 чувствовала…»), — чтобы «7.5 часов спала» не стало датой 7 мая
  {
    re: /^\s*(\d{1,2})[./](\d{1,2})(?:[./](\d{2,4}))?(?!\d)/,
    pick: (m) => [m[3], m[2], m[1]],
    ok: (m, after) => !!m[3] || m[2].length === 2 || /^\s*([—–:,-].*)?$/.test(after),
  },
  // 26 октября 2026
  { re: new RegExp(`^\\s*(\\d{1,2})\\s+(${MONTH_RE})\\.?(?:\\s+(\\d{4}))?`, 'i'), pick: (m) => [m[3], monthIndex(m[2]) + 1, m[1]] },
];

function monthIndex(word) {
  const w = word.toLowerCase();
  return MONTHS.findIndex((m) => m.split('|').some((p) => w.startsWith(p)));
}

// Год можно не писать: берём текущий, а если дата получилась в будущем — прошлый
function toKey(y, m, d) {
  const today = store.dateKey();
  let year = y ? Number(String(y).length === 2 ? `20${y}` : y) : Number(today.slice(0, 4));
  const mm = Number(m);
  const dd = Number(d);
  if (!(mm >= 1 && mm <= 12 && dd >= 1 && dd <= 31)) return null;
  const pad = (n) => String(n).padStart(2, '0');
  let key = `${year}-${pad(mm)}-${pad(dd)}`;
  if (!y && key > today) key = `${year - 1}-${pad(mm)}-${pad(dd)}`;
  // отсекаем несуществующие даты вроде 31.02
  const check = store.parseKey(key);
  return store.dateKey(check) === key ? key : null;
}

function matchDate(line) {
  for (const p of DATE_PATTERNS) {
    const m = line.match(p.re);
    if (!m) continue;
    const after = line.slice(m[0].length);
    if (p.ok && !p.ok(m, after)) continue;
    const key = toKey(...p.pick(m));
    if (!key) continue;
    const rest = after.replace(/^[\s,:.—–-]+/, '');
    // для диапазона дат оставляем пометку, за какие дни запись
    return { key, rest: p.label ? `(${p.label(m)}) ${rest}`.trim() : rest };
  }
  return null;
}

// Цифры из текста: «сон 7,5», «спала 8 ч», «состояние 6/10», «энергия 4», «тревога 3»
function extractMetrics(text) {
  const out = {};
  const num = (re, max) => {
    const m = text.match(re);
    if (!m) return undefined;
    const v = Number(m[1].replace(',', '.'));
    return Number.isFinite(v) && v >= 0 && v <= max ? v : undefined;
  };
  out.sleep = num(/(?:сон|спала|поспала)[^\d\n]{0,12}(\d{1,2}(?:[.,]\d)?)/i, 16);
  out.state = num(/(?:состояние|настроение)[^\d\n]{0,10}(\d{1,2})(?!\d)/i, 10);
  out.energy = num(/энерги[яиюей][^\d\n]{0,10}(\d{1,2})(?!\d)/i, 10);
  out.anxiety = num(/тревог[аиуе][^\d\n]{0,10}(\d{1,2})(?!\d)/i, 10);
  out.irritability = num(/раздраж[а-я]*[^\d\n]{0,10}(\d{1,2})(?!\d)/i, 10);
  for (const k of Object.keys(out)) {
    if (out[k] === undefined || (k !== 'sleep' && out[k] < 1)) delete out[k];
  }
  return out;
}

// Готовый файл с записями (.json): { entries: [{ date, sleep, state, ... text }] }.
// В отличие от «Загрузить из файла» в настройках, он не заменяет данные, а дописывает.
const JSON_FIELDS = ['sleep', 'state', 'energy', 'anxiety', 'irritability', 'text'];

function parseJsonNotes(raw) {
  let data;
  try {
    data = JSON.parse(raw);
  } catch {
    return null;
  }
  const list = Array.isArray(data) ? data : Array.isArray(data?.entries) ? data.entries : data?.entries && typeof data.entries === 'object' ? Object.values(data.entries) : null;
  if (!list) return null;
  const notes = list
    .filter((e) => e && store.isDateKey(e.date))
    .map((e) => {
      const n = { date: e.date };
      for (const k of JSON_FIELDS) {
        if (k === 'text' ? typeof e.text === 'string' && e.text.trim() : typeof e[k] === 'number') n[k] = k === 'text' ? e.text.trim() : e[k];
      }
      n.text = n.text || '';
      return n;
    });
  notes.sort((a, b) => b.date.localeCompare(a.date));
  return { notes, skipped: 0 };
}

export function parseNotes(raw) {
  if (/^\s*[[{]/.test(raw || '')) {
    const fromJson = parseJsonNotes(raw);
    if (fromJson) return fromJson;
  }
  const lines = String(raw || '').replace(/\r\n?/g, '\n').split('\n');
  const byDate = new Map();
  let current = null;
  let skipped = 0;
  for (const line of lines) {
    const d = matchDate(line);
    if (d) {
      current = byDate.get(d.key) || { date: d.key, lines: [] };
      byDate.set(d.key, current);
      if (d.rest) current.lines.push(d.rest);
    } else if (/^\s*что меня беспокоит\s*\??\s*:?\s*$/i.test(line)) {
      // заголовок дневника, а не часть записи
      continue;
    } else if (current) {
      current.lines.push(line);
    } else if (line.trim()) {
      skipped++;
    }
  }
  const notes = [...byDate.values()].map((n) => {
    const text = n.lines.join('\n').replace(/\n{3,}/g, '\n\n').trim();
    return { date: n.date, text, ...extractMetrics(text) };
  }).filter((n) => n.text || Object.keys(n).length > 2);
  notes.sort((a, b) => b.date.localeCompare(a.date));
  return { notes, skipped };
}

export function render(root) {
  root.innerHTML = `
    <div class="detail-head"><a class="icon-btn" href="#/settings" aria-label="Назад">${icon('back')}</a></div>
    <header class="page-head"><span class="hand">один раз</span><h1 class="display">Перенести старые заметки</h1></header>
    <section class="card">
      <p style="margin-top:0">Скопируй заметки «Что меня беспокоит?» целиком и вставь сюда, или загрузи .txt-файл. Каждая запись должна начинаться с даты на отдельной строке:</p>
      <pre class="sample">26.10
Спала плохо, сон 6. Состояние 5, энергия 4.
Переживаю из-за работы…

25 октября
…</pre>
      <p class="note">Подойдут даты вида 26.10, 26.10.2026, 2026-10-26 или «26 октября». Если в тексте есть «сон 7», «состояние 6», «энергия 5», «тревога 3» — цифры попадут в графики.</p>
      <textarea class="import-text" placeholder="Вставь заметки сюда" style="margin-top:14px"></textarea>
      <div class="actions">
        <button class="btn primary" data-act="parse">Разобрать</button>
        <!-- без accept: Android часто не знает тип .json и прячет такие файлы; содержимое проверяем сами -->
        <label class="btn ghost">Загрузить файл<input type="file" hidden></label>
      </div>
    </section>
    <section class="import-preview"></section>`;

  const ta = root.querySelector('.import-text');
  const preview = root.querySelector('.import-preview');

  root.querySelector('input[type="file"]').onchange = async (ev) => {
    const file = ev.target.files[0];
    ev.target.value = '';
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) return toast('Файл слишком большой — нужен текстовый файл с заметками');
    const text = await file.text();
    // фото или документ Word вместо текста
    if (text.includes('\u0000')) return toast('Это не текстовый файл. Выбери .txt или .json с заметками');
    ta.value = text;
    root.querySelector('[data-act="parse"]').click();
  };

  root.querySelector('[data-act="parse"]').onclick = () => {
    const { notes, skipped } = parseNotes(ta.value);
    if (!notes.length) {
      preview.innerHTML = `<div class="empty-state section">${art('notebook')}<p>Не нашла ни одной даты в начале строки. Проверь, что каждая запись начинается с даты, например <b>26.10</b>.</p></div>`;
      return;
    }
    const existing = notes.filter((n) => store.getEntry(n.date)).length;
    preview.innerHTML = `
      <div class="section-title section"><h2 class="h2">Нашла ${notes.length} ${plural(notes.length, ['запись', 'записи', 'записей'])}</h2></div>
      <p class="note" style="margin-top:-6px">
        ${existing ? `Для ${existing} ${plural(existing, ['дня', 'дней', 'дней'])} запись уже есть — текст допишется в конец, а оценки не перезапишутся. ` : ''}
        ${skipped ? `Строк до первой даты: ${skipped} — их пропущу.` : ''}
      </p>
      <button class="btn primary wide" data-act="import" style="margin:6px 0 14px">Импортировать ${notes.length} ${plural(notes.length, ['запись', 'записи', 'записей'])}</button>
      <div class="entry-list">
        ${notes.map((n) => `
          <div class="card entry-card">
            <span class="date">${esc(fmtShort(n.date))}${store.getEntry(n.date) ? ' <small class="muted">· допишу</small>' : ''}</span>
            <div class="chips">${metricChips(n)}</div>
            <p class="text">${esc(n.text) || '<i class="muted">без текста</i>'}</p>
          </div>`).join('')}
      </div>`;

    preview.querySelector('[data-act="import"]').onclick = () => {
      for (const n of notes) {
        const prev = store.getEntry(n.date) || {};
        const patch = {};
        for (const k of ['sleep', 'state', 'energy', 'anxiety', 'irritability']) {
          if (typeof n[k] === 'number' && typeof prev[k] !== 'number') patch[k] = n[k];
        }
        if (n.text && !(prev.text || '').includes(n.text)) {
          patch.text = prev.text ? `${prev.text}\n\n${n.text}` : n.text;
        }
        if (Object.keys(patch).length) store.saveEntry(n.date, { ...patch, imported: true });
      }
      toast(`Перенесено записей: ${notes.length}`);
      location.hash = '#/diary';
    };
  };
}
