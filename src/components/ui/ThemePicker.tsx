"use client";

import { THEME_OPTIONS } from "@/lib/themes";
import { useTheme } from "@/context/ThemeProvider";
import { useThemeVoice } from "@/hooks/useThemeVoice";

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
      <div className={`grid gap-2 ${compact ? "grid-cols-2" : "grid-cols-1 sm:grid-cols-2"}`}>
        {THEME_OPTIONS.map((option) => {
          const active = theme === option.id;
          return (
            <button
              key={option.id}
              type="button"
              onClick={() => setTheme(option.id)}
              className={`theme-option-btn text-left px-3 py-2 border-2 transition-all font-sans ${
                active
                  ? "border-accent-alt bg-surface text-accent shadow-glow-accent"
                  : "border-theme-muted bg-surface text-theme-muted hover:border-accent"
              }`}
            >
              <span
                className="block h-1.5 w-full rounded-full mb-1.5"
                style={{ background: option.swatch }}
              />
              <span className="font-display text-[8px] sm:text-[10px] block">
                {option.name}
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
