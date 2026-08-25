import "partysocket/event-target-polyfill";

import {
  DEFAULT_BOT_COUNT,
  MAX_BOT_COUNT,
  MIN_BOT_COUNT,
  type BotDifficulty,
  parseBotDifficulty,
} from "@cambio/game";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { generateRoomCode } from "@/room-code";
import { colors, spacing } from "@/theme";
import { usePlayerName } from "@/usePlayerName";

const BOT_DIFFICULTIES: BotDifficulty[] = ["easy", "medium", "hard"];

export default function HomeScreen() {
  const router = useRouter();
  const { playerName, setPlayerName, hydrated } = usePlayerName();
  const [joinCode, setJoinCode] = useState("");
  const [botCount, setBotCount] = useState(DEFAULT_BOT_COUNT);
  const [botDifficulty, setBotDifficulty] =
    useState<BotDifficulty>("medium");

  const trimmedName = playerName.trim();
  const hasName = trimmedName.length > 0;

  const goToRoom = (code: string, mode: "host" | "join") => {
    if (!hasName) return;
    setPlayerName(trimmedName);
    router.push({
      pathname: "/play/[roomId]",
      params: {
        roomId: code,
        name: trimmedName,
        [mode]: "1",
      },
    });
  };

  const goToSolo = () => {
    if (!hasName) return;
    setPlayerName(trimmedName);
    router.push({
      pathname: "/play/[roomId]",
      params: {
        roomId: generateRoomCode(),
        name: trimmedName,
        host: "1",
        solo: "1",
        bots: String(botCount),
        difficulty: botDifficulty,
      },
    });
  };

  if (!hydrated) {
    return <View style={styles.loading} />;
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="light" />
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.hero}>
          <Text style={styles.tagline}>The card game of memory and mischief</Text>
          <Text style={styles.title}>Cambio</Text>
          <Text style={styles.subtitle}>
            Create a room, invite friends, or practice against bots.
          </Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.label}>Nickname</Text>
          <TextInput
            value={playerName}
            onChangeText={setPlayerName}
            placeholder="Your name"
            placeholderTextColor={colors.textMuted}
            maxLength={24}
            autoCapitalize="words"
            autoCorrect={false}
            style={styles.input}
          />

          <Pressable
            style={[styles.primaryButton, !hasName && styles.buttonDisabled]}
            disabled={!hasName}
            onPress={() => goToRoom(generateRoomCode(), "host")}
          >
            <Text style={styles.primaryButtonText}>Create game</Text>
          </Pressable>

          <View style={styles.joinRow}>
            <View style={styles.joinInputWrap}>
              <Text style={styles.label}>Room code</Text>
              <TextInput
                value={joinCode}
                onChangeText={(value) => setJoinCode(value.toLowerCase())}
                placeholder="abc123"
                placeholderTextColor={colors.textMuted}
                maxLength={6}
                autoCapitalize="none"
                autoCorrect={false}
                style={styles.input}
              />
            </View>
            <Pressable
              style={[
                styles.secondaryButton,
                styles.joinButton,
                (joinCode.length < 4 || !hasName) && styles.buttonDisabled,
              ]}
              disabled={joinCode.length < 4 || !hasName}
              onPress={() => goToRoom(joinCode.trim(), "join")}
            >
              <Text style={styles.secondaryButtonText}>Join</Text>
            </Pressable>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Solo vs bots</Text>
          <View style={styles.soloRow}>
            <View style={styles.soloField}>
              <Text style={styles.label}>Bots</Text>
              <View style={styles.pickerRow}>
                {Array.from(
                  { length: MAX_BOT_COUNT - MIN_BOT_COUNT + 1 },
                  (_, index) => MIN_BOT_COUNT + index,
                ).map((count) => (
                  <Pressable
                    key={count}
                    style={[
                      styles.chip,
                      botCount === count && styles.chipSelected,
                    ]}
                    onPress={() => setBotCount(count)}
                  >
                    <Text
                      style={[
                        styles.chipText,
                        botCount === count && styles.chipTextSelected,
                      ]}
                    >
                      {count}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>

            <View style={styles.soloField}>
              <Text style={styles.label}>Difficulty</Text>
              <View style={styles.pickerRow}>
                {BOT_DIFFICULTIES.map((difficulty) => (
                  <Pressable
                    key={difficulty}
                    style={[
                      styles.chip,
                      botDifficulty === difficulty && styles.chipSelected,
                    ]}
                    onPress={() => setBotDifficulty(difficulty)}
                  >
                    <Text
                      style={[
                        styles.chipText,
                        botDifficulty === difficulty &&
                          styles.chipTextSelected,
                      ]}
                    >
                      {difficulty}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>
          </View>

          <Pressable
            style={[styles.primaryButton, !hasName && styles.buttonDisabled]}
            disabled={!hasName}
            onPress={goToSolo}
          >
            <Text style={styles.primaryButtonText}>Play vs bots</Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: colors.background,
    flex: 1,
  },
  loading: {
    backgroundColor: colors.background,
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    gap: spacing.section,
    justifyContent: "center",
    padding: spacing.screen,
  },
  hero: {
    alignItems: "center",
    gap: 8,
  },
  tagline: {
    color: colors.textMuted,
    fontSize: 12,
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  title: {
    color: colors.text,
    fontSize: 40,
    fontWeight: "800",
  },
  subtitle: {
    color: colors.textMuted,
    fontSize: 14,
    lineHeight: 20,
    textAlign: "center",
  },
  card: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 12,
    borderWidth: 1,
    gap: spacing.item,
    padding: spacing.section,
  },
  label: {
    color: colors.textMuted,
    fontSize: 12,
    marginBottom: 6,
    textTransform: "uppercase",
  },
  sectionTitle: {
    color: colors.textMuted,
    fontSize: 12,
    textTransform: "uppercase",
  },
  input: {
    backgroundColor: colors.surfaceElevated,
    borderColor: colors.border,
    borderRadius: 10,
    borderWidth: 1,
    color: colors.text,
    fontSize: 16,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  primaryButton: {
    alignItems: "center",
    backgroundColor: colors.accentSoft,
    borderRadius: 10,
    paddingVertical: 14,
  },
  primaryButtonText: {
    color: colors.background,
    fontSize: 16,
    fontWeight: "700",
  },
  secondaryButton: {
    alignItems: "center",
    backgroundColor: colors.surfaceElevated,
    borderColor: colors.border,
    borderRadius: 10,
    borderWidth: 1,
    justifyContent: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  secondaryButtonText: {
    color: colors.text,
    fontSize: 16,
    fontWeight: "600",
  },
  buttonDisabled: {
    opacity: 0.45,
  },
  joinRow: {
    alignItems: "flex-end",
    flexDirection: "row",
    gap: 8,
  },
  joinInputWrap: {
    flex: 1,
  },
  joinButton: {
    minWidth: 88,
  },
  soloRow: {
    gap: spacing.item,
  },
  soloField: {
    gap: 4,
  },
  pickerRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  chip: {
    borderColor: colors.border,
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  chipSelected: {
    backgroundColor: colors.accentSoft,
    borderColor: colors.accentSoft,
  },
  chipText: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: "600",
    textTransform: "capitalize",
  },
  chipTextSelected: {
    color: colors.background,
  },
});
