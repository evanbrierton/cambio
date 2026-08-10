import {
  type BotDifficulty,
  DEFAULT_BOT_COUNT,
  MAX_BOT_COUNT,
  MIN_BOT_COUNT,
} from "@/game/types";

export type BotSettings = {
  botCount: number;
  difficulty: BotDifficulty;
};

export const DEFAULT_BOT_SETTINGS: BotSettings = {
  botCount: DEFAULT_BOT_COUNT,
  difficulty: "easy",
};

export function clampBotCount(value: number): number {
  if (!Number.isFinite(value)) return DEFAULT_BOT_COUNT;
  return Math.min(MAX_BOT_COUNT, Math.max(MIN_BOT_COUNT, Math.round(value)));
}
