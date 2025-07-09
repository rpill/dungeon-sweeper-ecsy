export const TEXTS = {
  ru: {
    continue: "Продолжить",
    newGame: "Новая игра",
    rules: "Правила",
    settings: "Настройки",
    back: "Назад",
    sound: "Звуки",
    music: "Музыка",
    soundSettings: "Настройки звука",
    win: "Вы победили!",
    lose: "Вы проиграли!",
    time: "Время",
    score: "Счёт",
    scoreTab: "Очки",
    timeTab: "Время",
    rule1: "Победи дракона и выберись из замка.",
    rule2: "Безопасно потерять все сердца.",
    rule3: "Враги наносят урон при открытии их клетки.",
    rule4: "Число означает суммарный урон врагов вокруг клетки.",
    controls: "Управление:",
    lmb: "ЛКМ - открыть клетку.",
    shiftLmbRmb: "SHIFT + ЛКМ или ПКМ - поставить метку.",
    touchHero: "Коснитесь персонажа, чтобы повысить уровень.",
    level: "Ур.",
    menu: "Меню",
    summary: "Сводка",
    generatingLevel: "Генерируем уровень...",
    revive: "Ожить",
    surrender: "Сдаться",
    leaderboard: "Таблица лидеров",
    playerName: "Имя",
    anonymous: "Аноним",
    // ... добавьте остальные строки
  },
  en: {
    continue: "Continue",
    newGame: "New Game",
    rules: "Rules",
    settings: "Settings",
    back: "Back",
    sound: "Sound",
    music: "Music",
    soundSettings: "Sound Settings",
    win: "You win!",
    lose: "You lose!",
    time: "Time",
    score: "Score",
    scoreTab: "Score",
    timeTab: "Time",
    rule1: "Defeat the dragon and escape the castle.",
    rule2: "It's safe to lose all hearts.",
    rule3: "Enemies deal damage when you open their cell.",
    rule4: "The number shows the total damage from enemies around the cell.",
    controls: "Controls:",
    lmb: "LMB - open cell.",
    shiftLmbRmb: "SHIFT + LMB or RMB - place a mark.",
    touchHero: "Touch the hero to level up.",
    level: "Lvl.",
    menu: "Menu",
    summary: "Summary",
    generatingLevel: "Generating level...",
    revive: "Revive",
    surrender: "Give up",
    leaderboard: "Leaderboard",
    playerName: "Name",
    anonymous: "Anonymous",
    // ... add other strings
  }
};

let currentLang = "ru";

export function setLangBySDK(ysdk) {
  currentLang = ysdk?.environment?.i18n?.lang === "ru" ? "ru" : "en";
}

export function t(key) {
  return TEXTS[currentLang][key] || key;
} 