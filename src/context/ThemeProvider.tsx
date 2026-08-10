"use client";

import { type ReactNode, useCallback, useEffect, useState } from "react";
import { ThemeContext } from "@/context/theme-context";
import {
  APPEARANCE_MEDIA_QUERY,
  type AppearancePreference,
  DEFAULT_APPEARANCE,
  type ResolvedAppearance,
  resolveAppearance,
  setAppearanceCookie,
  setThemeCookie,
} from "@/lib/theme-cookie";
import { applyThemeFontClass } from "@/lib/theme-fonts";
import { DEFAULT_THEME, type ThemeId } from "@/lib/themes";

export function ThemeProvider({
  children,
  initialTheme = DEFAULT_THEME,
  initialAppearancePreference = DEFAULT_APPEARANCE,
}: {
  children: ReactNode;
  initialTheme?: ThemeId;
  initialAppearancePreference?: AppearancePreference;
}) {
  const [theme, setThemeState] = useState<ThemeId>(initialTheme);
  const [appearancePreference, setAppearancePreferenceState] =
    useState<AppearancePreference>(initialAppearancePreference);
  const [resolvedAppearance, setResolvedAppearance] =
    useState<ResolvedAppearance>(() => {
      if (typeof document !== "undefined") {
        const fromDom = document.documentElement.dataset.appearance;
        if (fromDom === "light" || fromDom === "dark") {
          return fromDom;
        }
      }
      return resolveAppearance(initialAppearancePreference, false);
    });

  const setTheme = useCallback((next: ThemeId) => {
    setThemeState(next);
    setThemeCookie(next);
    document.documentElement.dataset.theme = next;
    applyThemeFontClass(next);
  }, []);

  const applyResolvedAppearance = useCallback((next: ResolvedAppearance) => {
    setResolvedAppearance(next);
    document.documentElement.dataset.appearance = next;
    document.documentElement.style.colorScheme = next;
  }, []);

  const setAppearancePreference = useCallback(
    (next: AppearancePreference) => {
      setAppearancePreferenceState(next);
      setAppearanceCookie(next);

      const prefersDark =
        typeof document !== "undefined" &&
        globalThis.matchMedia(APPEARANCE_MEDIA_QUERY).matches;
      applyResolvedAppearance(resolveAppearance(next, prefersDark));
    },
    [applyResolvedAppearance],
  );

  useEffect(() => {
    const mediaQuery = globalThis.matchMedia(APPEARANCE_MEDIA_QUERY);
    const applyCurrentAppearance = () => {
      applyResolvedAppearance(
        resolveAppearance(appearancePreference, mediaQuery.matches),
      );
    };

    applyCurrentAppearance();
    if (appearancePreference !== "system") {
      return;
    }

    const handleChange = () => applyCurrentAppearance();
    mediaQuery.addEventListener("change", handleChange);
    return () => {
      mediaQuery.removeEventListener("change", handleChange);
    };
  }, [appearancePreference, applyResolvedAppearance]);

  return (
    <ThemeContext.Provider
      value={{
        theme,
        setTheme,
        appearancePreference,
        resolvedAppearance,
        setAppearancePreference,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}
