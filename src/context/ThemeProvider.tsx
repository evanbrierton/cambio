"use client";

import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useSyncExternalStore,
} from "react";
import {
  DEFAULT_THEME,
  isThemeId,
  THEME_STORAGE_KEY,
  type ThemeId,
} from "@/lib/themes";

type ThemeContextValue = {
  theme: ThemeId;
  setTheme: (theme: ThemeId) => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

let themeListeners: Array<() => void> = [];
let hasHydratedTheme = false;

function subscribeTheme(listener: () => void) {
  themeListeners.push(listener);
  return () => {
    themeListeners = themeListeners.filter((l) => l !== listener);
  };
}

function notifyThemeListeners() {
  for (const listener of themeListeners) {
    listener();
  }
}

function readStoredTheme(): ThemeId {
  try {
    const stored = localStorage.getItem(THEME_STORAGE_KEY);
    if (stored && isThemeId(stored)) return stored;
  } catch {
    // localStorage may be unavailable in private browsing / SSR guards.
  }
  return DEFAULT_THEME;
}

function getThemeSnapshot(): ThemeId {
  if (!hasHydratedTheme) return DEFAULT_THEME;
  return readStoredTheme();
}

function getServerThemeSnapshot(): ThemeId {
  return DEFAULT_THEME;
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const theme = useSyncExternalStore(
    subscribeTheme,
    getThemeSnapshot,
    getServerThemeSnapshot,
  );

  useEffect(() => {
    hasHydratedTheme = true;
    document.documentElement.dataset.theme = readStoredTheme();
    notifyThemeListeners();
  }, []);

  useEffect(() => {
    if (!hasHydratedTheme) return;
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  const setTheme = useCallback((next: ThemeId) => {
    localStorage.setItem(THEME_STORAGE_KEY, next);
    document.documentElement.dataset.theme = next;
    notifyThemeListeners();
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
