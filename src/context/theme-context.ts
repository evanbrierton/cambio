"use client";

import { createContext } from "react";
import type {
  AppearancePreference,
  ResolvedAppearance,
} from "@/lib/theme-cookie";
import type { ThemeId } from "@/lib/themes";

export interface ThemeContextValue {
  theme: ThemeId;
  setTheme: (theme: ThemeId) => void;
  appearancePreference: AppearancePreference;
  resolvedAppearance: ResolvedAppearance;
  setAppearancePreference: (preference: AppearancePreference) => void;
}

export const ThemeContext = createContext<ThemeContextValue | null>(null);
