import { z } from "zod";
import {
  clampMatchTargetSize,
  DEFAULT_MATCH_FILL_WITH_BOTS,
  DEFAULT_MATCH_TARGET_SIZE,
  type MatchmakingConfig,
} from "../matchmaking/types";

export const MATCH_SETTINGS_STORAGE_KEY = "cambio-match-settings";

export const DEFAULT_MATCH_SETTINGS: MatchmakingConfig = {
  targetSize: DEFAULT_MATCH_TARGET_SIZE,
  fillWithBots: DEFAULT_MATCH_FILL_WITH_BOTS,
};

const matchSettingsSchema = z
  .object({
    targetSize: z.number().optional(),
    fillWithBots: z.boolean().optional(),
  })
  .passthrough();

export function parseMatchSettings(raw: unknown): MatchmakingConfig {
  const result = matchSettingsSchema.safeParse(raw);
  if (!result.success) return { ...DEFAULT_MATCH_SETTINGS };

  return {
    targetSize: clampMatchTargetSize(
      result.data.targetSize ?? DEFAULT_MATCH_TARGET_SIZE,
    ),
    fillWithBots: result.data.fillWithBots ?? DEFAULT_MATCH_FILL_WITH_BOTS,
  };
}

export function parseMatchSettingsJson(raw: string): MatchmakingConfig {
  try {
    return parseMatchSettings(JSON.parse(raw));
  } catch {
    return { ...DEFAULT_MATCH_SETTINGS };
  }
}

export function loadMatchSettings(): MatchmakingConfig {
  if (typeof window === "undefined") return { ...DEFAULT_MATCH_SETTINGS };
  try {
    const raw = localStorage.getItem(MATCH_SETTINGS_STORAGE_KEY);
    if (!raw) return { ...DEFAULT_MATCH_SETTINGS };
    return parseMatchSettingsJson(raw);
  } catch {
    return { ...DEFAULT_MATCH_SETTINGS };
  }
}

export function saveMatchSettings(settings: MatchmakingConfig) {
  if (typeof window === "undefined") return;
  const next: MatchmakingConfig = {
    targetSize: clampMatchTargetSize(settings.targetSize),
    fillWithBots: Boolean(settings.fillWithBots),
  };
  try {
    localStorage.setItem(MATCH_SETTINGS_STORAGE_KEY, JSON.stringify(next));
  } catch {
    // Quota / private mode — ignore.
  }
}
