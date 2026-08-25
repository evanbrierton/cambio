import type { ClientMessage, PlayerView } from "@cambio/game";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { colors, spacing } from "@/theme";

type LobbyViewProps = {
  roomId: string;
  view: PlayerView;
  connected: boolean;
  send: (message: ClientMessage) => void;
};

export function LobbyView({ roomId, view, connected, send }: LobbyViewProps) {
  const readyCount = view.players.filter(
    (player) => (player.connected || player.isBot) && !player.isWaiting,
  ).length;
  const lobbyTitle = view.isSoloMode ? "Solo vs bots" : "Players in lobby";

  return (
    <ScrollView
      contentContainerStyle={styles.scrollContent}
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.header}>
        <Text style={styles.roomLabel}>Room</Text>
        <Text style={styles.roomCode}>{roomId}</Text>
        <View style={styles.connectionRow}>
          <View
            style={[
              styles.connectionDot,
              { backgroundColor: connected ? colors.success : colors.danger },
            ]}
          />
          <Text style={styles.connectionText}>
            {connected ? "Connected" : "Reconnecting…"}
          </Text>
        </View>
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionLabel}>{lobbyTitle}</Text>
          <Text style={styles.sectionCount}>{readyCount}/6</Text>
        </View>

        <View style={styles.playerList}>
          {view.players.map((player) => {
            const isSelf = player.id === view.playerId;
            return (
              <View
                key={player.id}
                style={[styles.playerRow, isSelf && styles.playerRowSelf]}
              >
                <Text style={styles.playerName} numberOfLines={1}>
                  {player.name}
                  {isSelf ? " (you)" : ""}
                </Text>
                <View style={styles.badges}>
                  {player.isBot ? (
                    <Text style={[styles.badge, styles.botBadge]}>Bot</Text>
                  ) : null}
                  {player.isHost ? (
                    <Text style={[styles.badge, styles.hostBadge]}>Host</Text>
                  ) : null}
                  {!player.connected && !player.isBot ? (
                    <Text style={[styles.badge, styles.awayBadge]}>Away</Text>
                  ) : null}
                  {player.isWaiting ? (
                    <Text style={[styles.badge, styles.waitingBadge]}>
                      Waiting
                    </Text>
                  ) : null}
                </View>
              </View>
            );
          })}
        </View>

        {view.canAddBot ? (
          <Pressable
            style={styles.secondaryButton}
            onPress={() => send({ type: "add_bot" })}
          >
            <Text style={styles.secondaryButtonText}>Add bot</Text>
          </Pressable>
        ) : null}

        {!view.canStartGame && !view.isMatchmade ? (
          <Text style={styles.waitingForHost}>Waiting for host to start…</Text>
        ) : null}

        {view.canStartGame ? (
          <Pressable
            style={styles.primaryButton}
            onPress={() => send({ type: "start_game" })}
          >
            <Text style={styles.primaryButtonText}>Start game</Text>
          </Pressable>
        ) : null}
      </View>
    </ScrollView>
  );
}

export function ConnectingView({
  error,
  showConnecting,
}: {
  error: string | null;
  showConnecting: boolean;
}) {
  return (
    <View style={styles.centered}>
      {error ? (
        <Text style={styles.errorText}>{error}</Text>
      ) : showConnecting ? (
        <>
          <ActivityIndicator color={colors.accent} />
          <Text style={styles.connectingText}>Connecting to game…</Text>
        </>
      ) : null}
    </View>
  );
}

export function GameInProgressView({ phase }: { phase: string }) {
  return (
    <View style={styles.centered}>
      <Text style={styles.gamePhaseTitle}>Game started</Text>
      <Text style={styles.gamePhaseSubtitle}>
        Phase: {phase}. Full table UI is coming in a later milestone.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    flexGrow: 1,
    gap: spacing.section,
    padding: spacing.screen,
  },
  header: {
    alignItems: "center",
    gap: 8,
  },
  roomLabel: {
    color: colors.textMuted,
    fontSize: 12,
    letterSpacing: 2,
    textTransform: "uppercase",
  },
  roomCode: {
    color: colors.text,
    fontSize: 32,
    fontWeight: "800",
    letterSpacing: 4,
    textTransform: "uppercase",
  },
  connectionRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 8,
  },
  connectionDot: {
    borderRadius: 6,
    height: 10,
    width: 10,
  },
  connectionText: {
    color: colors.textMuted,
    fontSize: 14,
  },
  section: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 12,
    borderWidth: 1,
    gap: spacing.item,
    padding: spacing.section,
  },
  sectionHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  sectionLabel: {
    color: colors.textMuted,
    fontSize: 12,
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  sectionCount: {
    color: colors.textMuted,
    fontSize: 12,
  },
  playerList: {
    gap: 8,
  },
  playerRow: {
    alignItems: "center",
    backgroundColor: colors.surfaceElevated,
    borderRadius: 10,
    flexDirection: "row",
    gap: 8,
    justifyContent: "space-between",
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  playerRowSelf: {
    borderColor: colors.accentSoft,
    borderWidth: 1,
  },
  playerName: {
    color: colors.text,
    flex: 1,
    fontSize: 16,
  },
  badges: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 4,
    justifyContent: "flex-end",
  },
  badge: {
    borderRadius: 999,
    fontSize: 10,
    fontWeight: "700",
    overflow: "hidden",
    paddingHorizontal: 8,
    paddingVertical: 4,
    textTransform: "uppercase",
  },
  botBadge: {
    backgroundColor: "#312e81",
    color: colors.accent,
  },
  hostBadge: {
    backgroundColor: "#14532d",
    color: colors.success,
  },
  awayBadge: {
    backgroundColor: "#422006",
    color: "#fbbf24",
  },
  waitingBadge: {
    backgroundColor: "#334155",
    color: colors.textMuted,
  },
  secondaryButton: {
    alignItems: "center",
    borderColor: colors.border,
    borderRadius: 10,
    borderWidth: 1,
    paddingVertical: 12,
  },
  secondaryButtonText: {
    color: colors.text,
    fontSize: 14,
    fontWeight: "600",
  },
  waitingForHost: {
    color: colors.textMuted,
    fontSize: 14,
    textAlign: "center",
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
  centered: {
    alignItems: "center",
    flex: 1,
    gap: 12,
    justifyContent: "center",
    padding: spacing.screen,
  },
  errorText: {
    color: colors.danger,
    fontSize: 16,
    textAlign: "center",
  },
  connectingText: {
    color: colors.textMuted,
    fontSize: 16,
  },
  gamePhaseTitle: {
    color: colors.text,
    fontSize: 24,
    fontWeight: "700",
    textAlign: "center",
  },
  gamePhaseSubtitle: {
    color: colors.textMuted,
    fontSize: 14,
    lineHeight: 20,
    textAlign: "center",
  },
});
