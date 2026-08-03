"use client";

import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { applyThemeFontClass } from "@/lib/theme-fonts";
import { setThemeCookie } from "@/lib/theme-cookie";
import { DEFAULT_THEME, isThemeId, THEME_STORAGE_KEY, type ThemeId } from "@/lib/themes";

type ThemeContextValue = {
  theme: ThemeId;
  setTheme: (theme: ThemeId) => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({
  children,
  initialTheme = DEFAULT_THEME,
}: {
  children: ReactNode;
  initialTheme?: ThemeId;
}) {
  const [theme, setThemeState] = useState<ThemeId>(initialTheme);

  useEffect(() => {
    const stored = localStorage.getItem(THEME_STORAGE_KEY);
    if (!stored || !isThemeId(stored)) return;

    localStorage.removeItem(THEME_STORAGE_KEY);
    if (stored === initialTheme) return;

    setThemeState(stored);
    setThemeCookie(stored);
    document.documentElement.dataset.theme = stored;
    applyThemeFontClass(stored);
  }, [initialTheme]);

  const setTheme = useCallback((next: ThemeId) => {
    setThemeState(next);
    setThemeCookie(next);
    document.documentElement.dataset.theme = next;
    applyThemeFontClass(next);
  }, []);

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
  return ctx;
}
