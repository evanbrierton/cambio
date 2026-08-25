import { deckSize } from "@cambio/game";
import { StatusBar } from "expo-status-bar";
import { ScrollView, Text, View } from "react-native";
import { PartySmokeTest } from "@/PartySmokeTest";
import { NativeThemePicker } from "@/theme/NativeThemePicker";
import { ThemedScreen } from "@/theme/ThemedScreen";
import { useExpoTheme } from "@/theme/ExpoThemeProvider";

export default function HomeScreen() {
  const { theme, resolvedAppearance, tokens, voice } = useExpoTheme();

  return (
    <ThemedScreen>
      <StatusBar style={resolvedAppearance === "light" ? "dark" : "light"} />
      <ScrollView
        contentContainerClassName="grow items-center px-6 py-10 gap-4"
        className="flex-1"
      >
        <Text className="text-4xl font-extrabold text-accent">{voice.tagline}</Text>
        <Text className="text-center text-sm text-foreground-muted">
          {voice.subtitle}
        </Text>
        <View className="w-full max-w-md rounded-panel border border-border bg-surface-elevated p-4">
          <Text className="text-[10px] uppercase tracking-wider text-foreground-muted">
            Theme preview
          </Text>
          <Text className="mt-2 text-lg text-foreground">{theme}</Text>
          <Text className="text-sm text-accent-soft">
            {resolvedAppearance} · deck {deckSize()} cards
          </Text>
          <View className="mt-3 flex-row gap-2">
            <View
              className="h-10 flex-1 rounded-card border border-border"
              style={{ backgroundColor: tokens.surfaceCard }}
            />
            <View
              className="h-10 flex-1 rounded-card border border-accent"
              style={{ backgroundColor: tokens.btnPrimaryBg }}
            />
            <View
              className="h-10 flex-1 rounded-card border border-accent-alt"
              style={{ backgroundColor: tokens.accentAlt }}
            />
          </View>
        </View>
        <NativeThemePicker />
        <PartySmokeTest />
      </ScrollView>
    </ThemedScreen>
  );
}
