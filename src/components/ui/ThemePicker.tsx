"use client";

import { useTheme } from "@/context/ThemeProvider";
import { useThemeVoice } from "@/hooks/useThemeVoice";
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

export function ThemePicker({ compact = false }: { compact?: boolean }) {
  const { theme, setTheme } = useTheme();
  const voice = useThemeVoice();

  return (
    <div
      className={`pixel-border bg-surface-elevated p-3 ${compact ? "" : "w-full max-w-md"}`}
    >
      <p className="font-display text-[8px] sm:text-[10px] text-theme-muted mb-2">
        {voice.styleLabel}
      </p>
      <div
        className={`grid gap-2 ${
          compact
            ? "grid-cols-[repeat(2,minmax(0,1fr))]"
            : "grid-cols-[minmax(0,1fr)] sm:grid-cols-[repeat(2,minmax(0,1fr))] lg:grid-cols-[repeat(4,minmax(0,1fr))]"
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
