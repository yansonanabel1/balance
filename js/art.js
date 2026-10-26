// Линейные иллюстрации «от руки»: чёрный контур + пятна пастели.
// Рисуются только на пастельных плитках, поэтому контур всегда тёмный.

const WARM = '#FFE39A';
const PEACH = '#F4C9B8';
const LEAF = '#CFE8B8';
const ROSE = '#F6C2C8';
const PAPER = '#FFFDF8';

const ART = {
  // утро: солнце над холмами и чашка
  sunrise: `
    <path d="M36 70a24 24 0 0 1 48 0z" fill="${WARM}"/>
    <path d="M60 36v-9M39 45l-6-6M81 45l6-6M28 61l-8-3M92 61l8-3"/>
    <path d="M4 76c14-8 27-10 39-4s22 8 34 2 26-9 39-2"/>
    <path d="M12 92c17-6 33-6 49 0s31 6 47-1"/>
    <path d="M66 88h30v7a15 15 0 0 1-30 0z" fill="${PAPER}"/>
    <path d="M96 91h4a5.5 5.5 0 0 1 0 11h-6"/>
    <path d="M75 82c-3-4 3-6 0-11M86 82c-3-4 3-6 0-11"/>
    <path d="M60 112c10 2 34 2 42 0"/>`,

  // готово: росток в горшке
  sprout: `
    <path d="M38 72h44v9H38z" fill="${PEACH}"/>
    <path d="M42 81h36l-5 29H47z" fill="${PEACH}"/>
    <path d="M60 72c0-13 1-25-1-37"/>
    <path d="M59 52C46 50 38 42 36 29c13 0 22 9 23 23z" fill="${LEAF}"/>
    <path d="M60 42c11-2 19-11 19-23-12 1-19 10-19 23z" fill="${LEAF}"/>
    <path d="M27 42l4 3M92 52l5-2M88 30l2-5M24 60l-4 1"/>`,

  // спокойное дыхание: воздушный змей на ветру
  kite: `
    <path d="M72 12l22 23-22 31-22-31z" fill="${PAPER}"/>
    <path d="M72 12v54M50 35h44"/>
    <path d="M72 66c-7 10 5 15-3 26s3 15-6 24"/>
    <path d="M66 80l-7-3 2 7zM63 99l-7 1 4 5z" fill="${ROSE}"/>
    <path d="M8 40c10-5 20 4 31 0M12 56c8-3 16 3 25 0M6 72c10-4 19 4 27 0"/>`,

  // 4-7-8: месяц, звёзды и облако
  moon: `
    <path d="M70 18a32 32 0 1 0 26 52 27 27 0 0 1-26-52z" fill="${WARM}"/>
    <path d="M30 22l2.5 6.5 6.5 2.5-6.5 2.5L30 40l-2.5-6.5L21 31l6.5-2.5z" fill="${PAPER}"/>
    <path d="M100 26l1.5 3.5 3.5 1.5-3.5 1.5-1.5 3.5-1.5-3.5-3.5-1.5 3.5-1.5z"/>
    <path d="M22 100c-9 0-11-13 0-13 2-9 15-11 19-2 9-2 15 7 9 15z" fill="${PAPER}"/>`,

  // квадратное дыхание: окно с цветком
  window: `
    <rect x="30" y="18" width="60" height="62" rx="3" fill="${PAPER}"/>
    <path d="M60 18v62M30 49h60"/>
    <path d="M25 14c7 21 7 52 0 72M95 14c-7 21-7 52 0 72"/>
    <path d="M20 86h80"/>
    <path d="M46 86l2-10h14l2 10z" fill="${PEACH}"/>
    <path d="M55 76c-1-8-7-11-11-13M55 76c2-8 8-11 13-11M55 76V62"/>`,

  // физиологический вздох: воздушный шар
  balloon: `
    <path d="M60 12c16 0 27 12 27 27 0 19-17 31-27 35-10-4-27-16-27-35 0-15 11-27 27-27z" fill="${ROSE}"/>
    <path d="M56 74l4 5 4-5"/>
    <path d="M60 79c-7 10 6 16 0 26s4 9 2 13"/>
    <path d="M45 30c2-6 6-10 11-11"/>
    <path d="M16 48h10M14 62h8M96 44h10M98 58h8"/>`,

  // пустой дневник: тетрадь и карандаш
  notebook: `
    <path d="M28 20h56a4 4 0 0 1 4 4v74a4 4 0 0 1-4 4H28z" fill="${PAPER}"/>
    <path d="M28 33h-7M28 49h-7M28 65h-7M28 81h-7"/>
    <path d="M40 40h34M40 52h28M40 64h36M40 76h20"/>
    <path d="M78 104l28-40 9 6-28 40-11 4z" fill="${WARM}"/>
    <path d="M102 70l9 6"/>`,

  // пустые графики: тропинка к флажку на горе
  path: `
    <path d="M8 98l31-46 16 21 19-35 38 60z" fill="${PAPER}"/>
    <path d="M74 38V16l15 6-15 6" fill="${ROSE}"/>
    <path d="M28 114c10-8 40-4 45-14s-14-13-6-23"/>
    <path d="M30 70l9 4 8-4"/>`,

  // окно помощи: свеча
  candle: `
    <path d="M47 54h26v48H47z" fill="${PAPER}"/>
    <path d="M47 63c4 0 4 7 8 7s3-7 7-7"/>
    <path d="M60 54v-7"/>
    <path d="M60 45c-9-6-5-17 0-24 5 7 9 18 0 24z" fill="${WARM}"/>
    <path d="M36 32l-6-5M84 32l6-5M31 48h-9M89 48h9"/>
    <path d="M36 102h48c0 7-48 7-48 0z" fill="${PEACH}"/>`,

  // диафрагмальное дыхание: ладони на груди и животе
  belly: `
    <path d="M40 20c-6 14-8 30-6 46 2 20 6 36 8 46M80 20c6 14 8 30 6 46-2 20-6 36-8 46" />
    <path d="M44 34c10 4 22 4 32 0"/>
    <path d="M36 70c8 10 40 10 48 0" fill="${PEACH}"/>
    <path d="M48 40h18a6 6 0 0 1 0 12H48z" fill="${PAPER}"/>
    <path d="M50 74h22a6 6 0 0 1 0 12H50z" fill="${PAPER}"/>
    <path d="M96 66c6 2 9 6 9 11M100 58c8 3 13 10 13 19"/>`,

  // холодная вода: кран и капли
  drop: `
    <path d="M30 26h40v12H30z" fill="${PAPER}"/>
    <path d="M70 30h12a8 8 0 0 1 8 8v6h-10v-4h-10"/>
    <path d="M44 26v-8h12v8M38 18h24"/>
    <path d="M85 56c-5 8-8 12-8 16a8 8 0 0 0 16 0c0-4-3-8-8-16z" fill="#BFE3F2"/>
    <path d="M64 78c-4 6-6 9-6 12a6 6 0 0 0 12 0c0-3-2-6-6-12z" fill="#BFE3F2"/>
    <path d="M30 104h60M36 112h48"/>
    <rect x="34" y="86" width="16" height="14" rx="3" fill="${PAPER}" transform="rotate(-12 42 93)"/>`,

  // якорь: кольцо
  ring: `
    <ellipse cx="60" cy="70" rx="30" ry="26" fill="${PAPER}"/>
    <ellipse cx="60" cy="70" rx="20" ry="16"/>
    <path d="M48 44l12-20 12 20z" fill="${ROSE}"/>
    <path d="M54 34h12M24 30l6 4M96 30l-6 4M60 12v6"/>`,

  // речь со знаками препинания
  comma: `
    <path d="M18 28h70a8 8 0 0 1 8 8v34a8 8 0 0 1-8 8H50l-16 14v-14H18a8 8 0 0 1-8-8V36a8 8 0 0 1 8-8z" fill="${PAPER}"/>
    <path d="M24 46h14M44 46h20M24 60h26"/>
    <circle cx="70" cy="46" r="2.5" fill="#1F1D1A"/>
    <path d="M58 62c2 0 3 2 1 6"/>
    <circle cx="80" cy="60" r="2.5" fill="#1F1D1A"/>`,

  // двое людей
  people: `
    <circle cx="40" cy="38" r="12" fill="${PAPER}"/>
    <circle cx="82" cy="42" r="12" fill="${PAPER}"/>
    <path d="M20 100c0-20 8-34 20-34s20 14 20 34z" fill="${LEAF}"/>
    <path d="M62 104c0-20 8-34 20-34s20 14 20 34z" fill="${PEACH}"/>
    <path d="M56 22c4-6 10-6 12 0M54 16l-2-4M70 16l2-4"/>`,

  // ладони с сердцем
  hands: `
    <path d="M60 46c-6-10-22-8-20 4 2 10 20 20 20 20s18-10 20-20c2-12-14-14-20-4z" fill="${ROSE}"/>
    <path d="M14 76c10 0 22 4 30 12 6 6 10 8 16 8s10-2 16-8c8-8 20-12 30-12"/>
    <path d="M14 76v20c14 0 26 6 34 10h24c8-4 20-10 34-10V76"/>
    <path d="M30 24l3 6M90 24l-3 6M60 14v7"/>`,

  // фигура человека (тело)
  body: `
    <circle cx="60" cy="22" r="10" fill="${PAPER}"/>
    <path d="M44 38h32l8 34-10 2-4-18v50H50V56l-4 18-10-2z" fill="${PAPER}"/>
    <circle cx="60" cy="52" r="7" fill="${ROSE}"/>
    <path d="M96 40c4 6 4 14 0 20M102 34c7 9 7 23 0 32M24 40c-4 6-4 14 0 20M18 34c-7 9-7 23 0 32"/>`,

  // глаз (наблюдение)
  eye: `
    <path d="M10 62c14-22 32-32 50-32s36 10 50 32c-14 22-32 32-50 32S24 84 10 62z" fill="${PAPER}"/>
    <circle cx="60" cy="62" r="18" fill="${LEAF}"/>
    <circle cx="60" cy="62" r="7" fill="#1F1D1A"/>
    <path d="M60 14v8M34 20l4 7M86 20l-4 7M60 102v8"/>`,

  // знак стоп
  stop: `
    <path d="M44 14h32l22 22v32L76 90H44L22 68V36z" fill="${ROSE}"/>
    <path d="M60 90v24M46 114h28"/>
    <rect x="38" y="46" width="44" height="12" rx="3" fill="${PAPER}"/>`,

  // облако мыслей
  cloud: `
    <path d="M30 70c-12 0-16-18-2-20 0-14 18-20 28-10 6-12 28-10 30 4 14 0 18 22 2 26z" fill="${PAPER}"/>
    <circle cx="38" cy="84" r="6" fill="${PAPER}"/>
    <circle cx="30" cy="98" r="4" fill="${PAPER}"/>
    <path d="M44 56h28M48 64h18"/>`,

  // очки (взгляд на мысли)
  glasses: `
    <circle cx="38" cy="64" r="20" fill="${PAPER}"/>
    <circle cx="84" cy="64" r="20" fill="${PAPER}"/>
    <path d="M58 62c2-4 6-4 6 0M18 60L8 48M104 60l10-12"/>
    <path d="M30 56c3-3 7-4 10-3M76 56c3-3 7-4 10-3"/>`,

  // стрелки в разные стороны
  arrows: `
    <path d="M20 46h58l-12-12M78 46l-12 12" />
    <path d="M100 78H42l12-12M42 78l12 12"/>
    <circle cx="20" cy="46" r="6" fill="${ROSE}"/>
    <circle cx="100" cy="78" r="6" fill="${LEAF}"/>`,

  // лист на воде
  leaf: `
    <path d="M30 70c4-26 30-44 64-44-2 30-24 52-50 52-6 0-10-2-14-8z" fill="${LEAF}"/>
    <path d="M36 74c14-14 30-26 48-36"/>
    <path d="M8 92c10-4 18 4 28 0s18-4 28 0 18 4 28 0 14-2 22 0"/>
    <path d="M18 106c8-3 16 3 24 0s16-3 24 0"/>`,

  // флажок на вершине
  flag: `
    <path d="M10 104l34-46 16 18 20-30 30 58z" fill="${PAPER}"/>
    <path d="M80 46V16l18 7-18 7" fill="${WARM}"/>
    <path d="M30 104l6-8M52 104l4-10M72 104l2-8"/>`,

  // установка на телефон
  phone: `
    <rect x="38" y="12" width="44" height="88" rx="8" fill="${PAPER}"/>
    <path d="M54 20h12"/>
    <rect x="47" y="34" width="12" height="12" rx="3" fill="${LEAF}"/>
    <rect x="63" y="34" width="12" height="12" rx="3" fill="${ROSE}"/>
    <rect x="47" y="52" width="12" height="12" rx="3" fill="${WARM}"/>
    <path d="M90 66c10 4 14 14 10 26M97 89l3 4 4-3"/>`,
};

export function art(name, cls = '') {
  return `<svg class="art ${cls}" viewBox="0 0 120 120" aria-hidden="true" fill="none" stroke="#1F1D1A" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">${ART[name] || ''}</svg>`;
}
