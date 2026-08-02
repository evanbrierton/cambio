import { DEFAULT_THEME, isThemeId, type ThemeId } from "@/lib/themes";

export const THEME_COOKIE_KEY = "cambio-theme";

const THEME_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

export function parseThemeCookie(value: string | undefined): ThemeId {
  if (value && isThemeId(value)) return value;
  return DEFAULT_THEME;
}

export function setThemeCookie(theme: ThemeId): void {
  document.cookie = `${THEME_COOKIE_KEY}=${theme};path=/;max-age=${THEME_COOKIE_MAX_AGE};SameSite=Lax`;
}
