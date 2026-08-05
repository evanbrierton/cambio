import { DEFAULT_THEME, isThemeId, type ThemeId } from "@/lib/themes";

export const THEME_COOKIE_KEY = "cambio-theme";

const THEME_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

export function parseThemeCookie(value: string | undefined): ThemeId {
  if (value && isThemeId(value)) return value;
  return DEFAULT_THEME;
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
