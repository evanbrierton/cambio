import type { StorageAdapter } from "./types";

export const THEME_PREF_KEY = "cambio-theme";
export const APPEARANCE_PREF_KEY = "cambio-appearance";

const THEME_PREF_VALUES = [
  "retro",
  "casino",
  "party",
  "minimal",
  "calm",
  "library",
  "lodge",
  "ink",
] as const;

const APPEARANCE_PREF_VALUES = ["light", "dark", "system"] as const;

export type ThemePref = (typeof THEME_PREF_VALUES)[number];
export type AppearancePref = (typeof APPEARANCE_PREF_VALUES)[number];

const THEME_VALUES = new Set<string>(THEME_PREF_VALUES);
const APPEARANCE_VALUES = new Set<string>(APPEARANCE_PREF_VALUES);

export function readThemePref(
  storage: StorageAdapter,
  fallback: ThemePref = "retro",
): ThemePref {
  const value = storage.getItem(THEME_PREF_KEY);
  return value && THEME_VALUES.has(value) ? (value as ThemePref) : fallback;
}

export function writeThemePref(storage: StorageAdapter, theme: ThemePref): void {
  storage.setItem(THEME_PREF_KEY, theme);
}

export function readAppearancePref(
  storage: StorageAdapter,
  fallback: AppearancePref = "system",
): AppearancePref {
  const value = storage.getItem(APPEARANCE_PREF_KEY);
  return value && APPEARANCE_VALUES.has(value)
    ? (value as AppearancePref)
    : fallback;
}

export function writeAppearancePref(
  storage: StorageAdapter,
  preference: AppearancePref,
): void {
  storage.setItem(APPEARANCE_PREF_KEY, preference);
}

export function isThemePref(value: string): value is ThemePref {
  return THEME_VALUES.has(value);
}

export function isAppearancePref(value: string): value is AppearancePref {
  return APPEARANCE_VALUES.has(value);
}
