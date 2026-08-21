"use client";

import { hapticClick } from "@cambio/client";
import { Monitor, Moon, Sun } from "lucide-react";
import type { ReactNode } from "react";
import { useTheme } from "@/context/ThemeProvider";
import { useThemeVoice } from "@/hooks/useThemeVoice";
import type { AppearancePreference } from "@/lib/theme-cookie";
import { THEME_OPTIONS } from "@/lib/themes";

function renderThemePickerName(name: string, isRetro: boolean) {
  if (!isRetro) return name;

  const space = name.indexOf(" ");
  if (space === -1) return name;

  const firstWord = name.slice(0, space);
  if (firstWord.length <= 9) return name;

  return (
    <>
      {firstWord}
      <br />
      {name.slice(space + 1)}
    </>
  );
}

const APPEARANCE_ICON_CLASS = "size-3.5 shrink-0";

const APPEARANCE_ICONS: Record<AppearancePreference, ReactNode> = {
  light: <Sun aria-hidden className={APPEARANCE_ICON_CLASS} />,
  dark: <Moon aria-hidden className={APPEARANCE_ICON_CLASS} />,
  system: <Monitor aria-hidden className={APPEARANCE_ICON_CLASS} />,
};

export function ThemePicker({ compact = false }: { compact?: boolean }) {
  const {
    theme,
    setTheme,
    appearancePreference,
    resolvedAppearance,
    setAppearancePreference,
  } = useTheme();
  const voice = useThemeVoice();

  const appearanceOptions: {
    id: AppearancePreference;
    label: string;
    title: string;
  }[] = [
    {
      id: "light",
      label: voice.appearanceLight,
      title: voice.appearanceLight,
    },
    {
      id: "dark",
      label: voice.appearanceDark,
      title: voice.appearanceDark,
    },
    {
      id: "system",
      label: voice.appearanceSystem,
      title: `${voice.appearanceSystem}: ${
        resolvedAppearance === "dark"
          ? voice.appearanceDark
          : voice.appearanceLight
      }`,
    },
  ];

  return (
    <div
      className={`pixel-border bg-surface-elevated p-3 ${compact ? "" : "w-full max-w-md"}`}
    >
      <div
        className={`mb-3 flex gap-2 ${
          compact
            ? "flex-col"
            : "flex-col sm:flex-row sm:items-center sm:justify-between"
        }`}
      >
        <p className="font-display text-[8px] sm:text-[10px] text-theme-muted">
          {voice.styleLabel}
        </p>
        <div className="chip-btn border-theme-muted bg-surface px-1 py-1 inline-flex items-center gap-0.5 self-start">
          {appearanceOptions.map((option) => {
            const active = appearancePreference === option.id;
            return (
              <button
                key={option.id}
                type="button"
                onClick={() => {
                  hapticClick("selection");
                  setAppearancePreference(option.id);
                }}
                aria-label={option.label}
                aria-pressed={active}
                title={option.title}
                className={`inline-flex h-7 w-7 items-center justify-center border transition-colors ${
                  active
                    ? "border-accent bg-surface-elevated text-accent"
                    : "border-transparent text-theme-muted hover:text-theme"
                }`}
              >
                {APPEARANCE_ICONS[option.id]}
              </button>
            );
          })}
        </div>
      </div>
      <div
        className={`grid gap-2 ${
          compact
            ? "grid-cols-2"
            : "grid-cols-[minmax(0,1fr)] sm:grid-cols-2 lg:grid-cols-4"
        }`}
      >
        {THEME_OPTIONS.map((option) => {
          const active = theme === option.id;
          return (
            <button
              key={option.id}
              type="button"
              onClick={() => {
                hapticClick("selection");
                setTheme(option.id);
              }}
              className={`theme-option-btn min-w-0 text-left px-3 py-2 border-2 transition-[border-color,background-color,color,box-shadow] font-sans ${
                active
                  ? "border-accent-alt bg-surface text-accent shadow-glow-accent"
                  : "border-theme-muted bg-surface text-theme-muted hover:border-accent"
              }`}
            >
              <span
                className="block h-1.5 w-full rounded-full mb-1.5"
                style={{ background: option.swatch }}
              />
              <span className="theme-option-name font-display block">
                {renderThemePickerName(option.name, theme === "retro")}
              </span>
              {!compact && (
                <span className="text-[10px] opacity-70 block mt-0.5 normal-case tracking-normal font-sans">
                  {option.description}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
