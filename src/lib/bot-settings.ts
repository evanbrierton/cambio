import {
  type BotDifficulty,
  DEFAULT_BOT_COUNT,
  MAX_BOT_COUNT,
  MIN_BOT_COUNT,
  parseBotDifficulty,
} from "@/game/types";

export const BOT_SETTINGS_KEY = "cambio-bot-settings";

export type BotSettings = {
  botCount: number;
  difficulty: BotDifficulty;
};

const DEFAULT_BOT_SETTINGS: BotSettings = {
  botCount: DEFAULT_BOT_COUNT,
  difficulty: "easy",
};

function clampBotCount(value: number): number {
  if (!Number.isFinite(value)) return DEFAULT_BOT_COUNT;
  return Math.min(MAX_BOT_COUNT, Math.max(MIN_BOT_COUNT, Math.round(value)));
}

export function loadBotSettings(): BotSettings {
  if (typeof window === "undefined") return DEFAULT_BOT_SETTINGS;

  try {
    const raw = localStorage.getItem(BOT_SETTINGS_KEY);
    if (!raw) return DEFAULT_BOT_SETTINGS;

    const parsed = JSON.parse(raw) as Partial<BotSettings>;
    return {
      botCount: clampBotCount(parsed.botCount ?? DEFAULT_BOT_COUNT),
      difficulty: parseBotDifficulty(parsed.difficulty ?? null),
    };
  } catch {
    return DEFAULT_BOT_SETTINGS;
  }
}

export function saveBotSettings(settings: BotSettings): void {
  if (typeof window === "undefined") return;

  localStorage.setItem(
    BOT_SETTINGS_KEY,
    JSON.stringify({
      botCount: clampBotCount(settings.botCount),
      difficulty: parseBotDifficulty(settings.difficulty),
    }),
  );
}
