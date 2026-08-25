import { HAND_BASE_SLOTS, SETUP_PEEK_SLOTS, type PublicPlayer } from "@cambio/game";
import { StyleSheet, Text, View } from "react-native";
import { colors } from "@/theme";
import { useExpoTheme } from "@/theme/ExpoThemeProvider";
import { PixelCard } from "./PixelCard";

type PlayerSeatProps = {
  player: PublicPlayer;
  viewerId: string;
  phase: string;
  ownSetupPeekedSlots: number[];
  canSwap?: boolean;
  onCardPress?: (playerId: string, slot: number, isOwn: boolean) => void;
};

export function PlayerSeat({
  player,
  viewerId,
  phase,
  ownSetupPeekedSlots,
  canSwap,
  onCardPress,
}: PlayerSeatProps) {
  const { tokens, voice } = useExpoTheme();
  const isOwn = player.id === viewerId;
  const showDrawnSwapHint = isOwn && canSwap;
  const setupPeeksRemaining = Math.max(
    0,
    SETUP_PEEK_SLOTS.length - ownSetupPeekedSlots.length,
  );
  const showSetupPeekHint =
    phase === "setup_peek" && isOwn && setupPeeksRemaining > 0;

  const styles = StyleSheet.create({
    seat: {
      backgroundColor: tokens.surface,
      borderColor: player.isCurrentTurn ? tokens.accent : tokens.border,
      borderRadius: 12,
      borderWidth: player.isCurrentTurn ? 2 : 1,
      gap: 8,
      padding: 10,
    },
    header: {
      alignItems: "center",
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 6,
      justifyContent: "space-between",
    },
    name: {
      color: tokens.foreground,
      flex: 1,
      fontSize: 14,
      fontWeight: "700",
    },
    badges: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 4,
    },
    badge: {
      borderRadius: 999,
      fontSize: 9,
      fontWeight: "700",
      overflow: "hidden",
      paddingHorizontal: 6,
      paddingVertical: 2,
      textTransform: "uppercase",
    },
    turnBadge: {
      backgroundColor: tokens.accentSoft,
      color: tokens.background,
    },
    botBadge: {
      backgroundColor: "#312e81",
      color: tokens.accent,
    },
    hostBadge: {
      backgroundColor: "#14532d",
      color: colors.success,
    },
    cambioBadge: {
      backgroundColor: "#422006",
      color: "#fbbf24",
    },
    hint: {
      color: tokens.foregroundMuted,
      fontSize: 11,
      textAlign: "center",
    },
    handGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 6,
      justifyContent: "center",
    },
  });

  const baseSlots = Array.from({ length: HAND_BASE_SLOTS }, (_, index) => {
    const slot = player.hand[index] ?? {
      card: null,
      faceUp: false,
      hidden: false,
      empty: true,
    };
    return { slot, index };
  });

  return (
    <View style={styles.seat}>
      <View style={styles.header}>
        <Text style={styles.name} numberOfLines={1}>
          {player.name}
          {isOwn ? " (you)" : ""}
        </Text>
        <View style={styles.badges}>
          {player.isCurrentTurn ? (
            <Text style={[styles.badge, styles.turnBadge]}>{voice.turn}</Text>
          ) : null}
          {player.isBot ? (
            <Text style={[styles.badge, styles.botBadge]}>Bot</Text>
          ) : null}
          {player.isHost ? (
            <Text style={[styles.badge, styles.hostBadge]}>{voice.host}</Text>
          ) : null}
          {player.hasCalledCambio ? (
            <Text style={[styles.badge, styles.cambioBadge]}>{voice.cambio}</Text>
          ) : null}
        </View>
      </View>

      {showSetupPeekHint ? (
        <Text style={styles.hint}>
          Tap bottom cards (#3 and #4) to peek during setup
        </Text>
      ) : null}
      {showDrawnSwapHint ? (
        <Text style={styles.hint}>{voice.swapHintOptional}</Text>
      ) : null}

      <View style={styles.handGrid}>
        {baseSlots.map(({ slot, index }) => {
          const isEmpty = !!slot.empty;
          const alreadySetupPeeked = isOwn && ownSetupPeekedSlots.includes(index);
          const setupLocked =
            phase === "setup_peek" &&
            (!isOwn ||
              !SETUP_PEEK_SLOTS.includes(index) ||
              isEmpty ||
              alreadySetupPeeked);
          const canInteract =
            (showDrawnSwapHint && isOwn && !setupLocked) ||
            (phase === "setup_peek" && isOwn && !setupLocked && !isEmpty);

          return (
            <PixelCard
              key={`${player.id}-${index}`}
              card={slot.card}
              empty={isEmpty}
              hidden={slot.hidden}
              faceUp={slot.faceUp}
              highlightSwap={canInteract && (showDrawnSwapHint || phase === "setup_peek")}
              onPress={
                canInteract && onCardPress
                  ? () => onCardPress(player.id, index, isOwn)
                  : undefined
              }
              disabled={!canInteract}
            />
          );
        })}
      </View>
    </View>
  );
}
