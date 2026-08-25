import {
  getDefaultPlatformAdapters,
  readAppearancePref,
  readThemePref,
  writeAppearancePref,
  writeThemePref,
  type AppearancePref,
  type ThemePref,
} from "@cambio/client/platform";
import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useColorScheme } from "react-native";
import type { ResolvedAppearance } from "@cambio/web-lib/theme-tokens";
import {
  getThemeColorTokens,
  themeTokensToNativeWindVars,
  type ThemeColorTokens,
} from "@cambio/web-lib/theme-tokens";
import { getThemeVoice, type ThemeId } from "@cambio/web-lib/themes";

type ExpoThemeContextValue = {
  theme: ThemeId;
  setTheme: (theme: ThemeId) => void;
  appearancePreference: AppearancePref;
  resolvedAppearance: ResolvedAppearance;
  setAppearancePreference: (preference: AppearancePref) => void;
  tokens: ThemeColorTokens;
  nativeWindVars: Record<string, string | number>;
  voice: ReturnType<typeof getThemeVoice>;
};

const ExpoThemeContext = createContext<ExpoThemeContextValue | null>(null);

function resolveAppearance(
  preference: AppearancePref,
  systemScheme: "light" | "dark" | null | undefined,
): ResolvedAppearance {
  if (preference === "system") {
    return systemScheme === "light" ? "light" : "dark";
  }
  return preference;
}

export function ExpoThemeProvider({ children }: { children: ReactNode }) {
  const systemScheme = useColorScheme();
  const storage = getDefaultPlatformAdapters().persistentStorage;
  const [theme, setThemeState] = useState<ThemeId>(() =>
    readThemePref(storage) as ThemeId,
  );
  const [appearancePreference, setAppearancePreferenceState] =
    useState<AppearancePref>(() => readAppearancePref(storage));
  const [resolvedAppearance, setResolvedAppearance] =
    useState<ResolvedAppearance>(() =>
      resolveAppearance(readAppearancePref(storage), systemScheme),
    );

  useEffect(() => {
    setResolvedAppearance(resolveAppearance(appearancePreference, systemScheme));
  }, [appearancePreference, systemScheme]);

  const setTheme = useCallback(
    (next: ThemeId) => {
      setThemeState(next);
      writeThemePref(storage, next as ThemePref);
    },
    [storage],
  );

  const setAppearancePreference = useCallback(
    (next: AppearancePref) => {
      setAppearancePreferenceState(next);
      writeAppearancePref(storage, next);
      setResolvedAppearance(resolveAppearance(next, systemScheme));
    },
    [storage, systemScheme],
  );

  const tokens = useMemo(
    () => getThemeColorTokens(theme, resolvedAppearance),
    [theme, resolvedAppearance],
  );
  const nativeWindVars = useMemo(
    () => themeTokensToNativeWindVars(tokens),
    [tokens],
  );
  const voice = useMemo(() => getThemeVoice(theme), [theme]);

  const value = useMemo(
    () => ({
      theme,
      setTheme,
      appearancePreference,
      resolvedAppearance,
      setAppearancePreference,
      tokens,
      nativeWindVars,
      voice,
    }),
    [
      theme,
      setTheme,
      appearancePreference,
      resolvedAppearance,
      setAppearancePreference,
      tokens,
      nativeWindVars,
      voice,
    ],
  );

  return (
    <ExpoThemeContext.Provider value={value}>
      {children}
    </ExpoThemeContext.Provider>
  );
}

export function useExpoTheme() {
  const ctx = useContext(ExpoThemeContext);
  if (!ctx) {
    throw new Error("useExpoTheme must be used within ExpoThemeProvider");
  }
  return ctx;
}
