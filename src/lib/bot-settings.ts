import { z } from "zod";
import {
  type BotDifficulty,
  DEFAULT_BOT_COUNT,
  MAX_BOT_COUNT,
  MIN_BOT_COUNT,
  parseBotDifficulty,
} from "../game/types";

export interface BotSettings {
  botCount: number;
  difficulty: BotDifficulty;
}

export const DEFAULT_BOT_SETTINGS: BotSettings = {
  botCount: DEFAULT_BOT_COUNT,
  difficulty: "easy",
};

export function clampBotCount(value: number): number {
  if (!Number.isFinite(value)) {
    return DEFAULT_BOT_COUNT;
  }
  return Math.min(MAX_BOT_COUNT, Math.max(MIN_BOT_COUNT, Math.round(value)));
}

export const legacyBotSettingsSchema = z
  .object({
    botCount: z.number().optional(),
    difficulty: z.enum(["easy", "medium", "hard"]).optional(),
  })
  .passthrough();

export function parseLegacyBotSettings(raw: unknown): BotSettings {
  const result = legacyBotSettingsSchema.safeParse(raw);
  if (!result.success) {
    return DEFAULT_BOT_SETTINGS;
  }

  return {
    botCount: clampBotCount(result.data.botCount ?? DEFAULT_BOT_COUNT),
    difficulty: parseBotDifficulty(result.data.difficulty ?? null),
  };
}

export function parseLegacyBotSettingsJson(raw: string): BotSettings {
  try {
    return parseLegacyBotSettings(JSON.parse(raw));
  } catch {
    return DEFAULT_BOT_SETTINGS;
  }
}
