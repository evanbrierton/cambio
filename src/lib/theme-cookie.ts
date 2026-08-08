import { DEFAULT_THEME, isThemeId, type ThemeId } from "@/lib/themes";

export const THEME_COOKIE_KEY = "cambio-theme";
export const APPEARANCE_COOKIE_KEY = "cambio-appearance";
export const APPEARANCE_MEDIA_QUERY = "(prefers-color-scheme: dark)";

const THEME_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;
const APPEARANCE_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

const APPEARANCE_PREFERENCES = ["light", "dark", "system"] as const;

export type AppearancePreference = (typeof APPEARANCE_PREFERENCES)[number];
export type ResolvedAppearance = Exclude<AppearancePreference, "system">;
export const DEFAULT_APPEARANCE: AppearancePreference = "system";

export function parseThemeCookie(value: string | undefined): ThemeId {
  if (value && isThemeId(value)) return value;
  return DEFAULT_THEME;
}

export function parseAppearanceCookie(
  value: string | undefined,
): AppearancePreference {
  if (value && isAppearancePreference(value)) return value;
  return DEFAULT_APPEARANCE;
}

export function setThemeCookie(theme: ThemeId): void {
  if (typeof cookieStore === "undefined") return;

  void cookieStore.set({
    name: THEME_COOKIE_KEY,
    value: theme,
    path: "/",
    expires: Date.now() + THEME_COOKIE_MAX_AGE * 1000,
    sameSite: "lax",
  });
}

export function setAppearanceCookie(preference: AppearancePreference): void {
  if (typeof cookieStore === "undefined") return;

  void cookieStore.set({
    name: APPEARANCE_COOKIE_KEY,
    value: preference,
    path: "/",
    expires: Date.now() + APPEARANCE_COOKIE_MAX_AGE * 1000,
    sameSite: "lax",
  });
}

export function resolveAppearance(
  preference: AppearancePreference,
  prefersDark: boolean,
): ResolvedAppearance {
  if (preference === "system") return prefersDark ? "dark" : "light";
  return preference;
}

function isAppearancePreference(value: string): value is AppearancePreference {
  return APPEARANCE_PREFERENCES.includes(value as AppearancePreference);
}
