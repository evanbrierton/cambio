"use client";

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

function SunIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 16 16"
      className="h-3.5 w-3.5"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
    >
      <circle cx="8" cy="8" r="2.75" />
      <path
        strokeLinecap="round"
        d="M8 1.5v1.5M8 13v1.5M1.5 8H3M13 8h1.5M3.4 3.4l1.1 1.1M11.5 11.5l1.1 1.1M12.6 3.4l-1.1 1.1M4.5 11.5l-1.1 1.1"
      />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 16 16"
      className="h-3.5 w-3.5"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12.5 9.2A5.1 5.1 0 0 1 6.8 3.5 5.25 5.25 0 1 0 12.5 9.2Z"
      />
    </svg>
  );
}

function SystemIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 16 16"
      className="h-3.5 w-3.5"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
    >
      <rect x="2.25" y="3" width="11.5" height="8" rx="1.25" />
      <path strokeLinecap="round" d="M5.5 13h5M8 11v2" />
    </svg>
  );
}

const APPEARANCE_ICONS: Record<AppearancePreference, ReactNode> = {
  light: <SunIcon />,
  dark: <MoonIcon />,
  system: <SystemIcon />,
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
                onClick={() => setAppearancePreference(option.id)}
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
              onClick={() => setTheme(option.id)}
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
