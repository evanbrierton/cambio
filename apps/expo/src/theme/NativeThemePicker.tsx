import { Pressable, Text, View } from "react-native";
import { vars } from "nativewind";
import { THEME_OPTIONS, type ThemeId } from "@cambio/web-lib/themes";
import type { AppearancePref } from "@cambio/client/platform";
import { useExpoTheme } from "./ExpoThemeProvider";

const APPEARANCE_OPTIONS: AppearancePref[] = ["light", "dark", "system"];

export function NativeThemePicker() {
  const {
    theme,
    setTheme,
    appearancePreference,
    setAppearancePreference,
    resolvedAppearance,
    nativeWindVars,
    voice,
  } = useExpoTheme();

  return (
    <View
      style={vars(nativeWindVars)}
      className="w-full max-w-md rounded-panel border border-border bg-surface-elevated p-3"
    >
      <View className="mb-3 flex-row flex-wrap items-center justify-between gap-2">
        <Text className="text-[10px] uppercase tracking-wider text-foreground-muted">
          {voice.styleLabel}
        </Text>
        <View className="flex-row gap-1 rounded-btn border border-border-muted bg-surface p-1">
          {APPEARANCE_OPTIONS.map((option) => {
            const active = appearancePreference === option;
            const label =
              option === "light"
                ? voice.appearanceLight
                : option === "dark"
                  ? voice.appearanceDark
                  : voice.appearanceSystem;
            return (
              <Pressable
                key={option}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
                onPress={() => setAppearancePreference(option)}
                className={`min-w-[2.5rem] items-center rounded-btn px-2 py-1 ${
                  active
                    ? "border border-accent bg-surface-elevated"
                    : "border border-transparent"
                }`}
              >
                <Text
                  className={`text-[10px] ${
                    active ? "text-accent" : "text-foreground-muted"
                  }`}
                >
                  {label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      <Text className="mb-2 text-[10px] text-foreground-muted">
        {voice.appearanceLabel}:{" "}
        {resolvedAppearance === "dark"
          ? voice.appearanceDark
          : voice.appearanceLight}
      </Text>

      <View className="flex-row flex-wrap gap-2">
        {THEME_OPTIONS.map((option: (typeof THEME_OPTIONS)[number]) => {
          const active = theme === option.id;
          return (
            <Pressable
              key={option.id}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              onPress={() => setTheme(option.id as ThemeId)}
              className={`min-w-[46%] flex-1 rounded-btn border-2 px-3 py-2 ${
                active
                  ? "border-accent-alt bg-surface"
                  : "border-border-muted bg-surface"
              }`}
            >
              <View
                className="mb-1.5 h-1.5 w-full rounded-full"
                style={{ backgroundColor: option.swatch }}
              />
              <Text
                className={`text-[10px] font-semibold ${
                  active ? "text-accent" : "text-foreground-muted"
                }`}
              >
                {option.name}
              </Text>
              <Text className="mt-0.5 text-[10px] text-foreground-muted">
                {option.description}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
