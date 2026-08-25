import { SETUP_PEEK_SLOTS, type ClientMessage, type PlayerView } from "@cambio/game";
import type {
  DeckDrawFlash,
  DiscardDrawFlash,
  FleetingPeek,
} from "@cambio/client";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { colors } from "@/theme";
import { useExpoTheme } from "@/theme/ExpoThemeProvider";
import { PlayerSeat } from "./PlayerSeat";
import { TableDeckArea } from "./TableDeckArea";

export type GameTableProps = {
  view: PlayerView;
  connected: boolean;
  error: string | null;
  fleetingPeek: FleetingPeek | null;
  discardDrawFlash: DiscardDrawFlash | null;
  deckDrawFlash: DeckDrawFlash | null;
  send: (message: ClientMessage) => void;
};

export function GameTable({
  view,
  connected,
  error,
  discardDrawFlash,
  deckDrawFlash,
  send,
}: GameTableProps) {
  const { tokens, voice } = useExpoTheme();

  const phaseLabel = voice.phases[view.phase as keyof typeof voice.phases] ?? view.phase;
  const currentTurnPlayer = view.players.find((player) => player.isCurrentTurn);
  const turnLabel =
    currentTurnPlayer?.id === view.playerId
      ? "Your turn"
      : currentTurnPlayer
        ? `${currentTurnPlayer.name}'s turn`
        : null;

  const orderedPlayers = [...view.players].sort((a, b) => {
    if (a.id === view.playerId) return -1;
    if (b.id === view.playerId) return 1;
    return 0;
  });

  const handleCardPress = (playerId: string, slot: number, isOwn: boolean) => {
    if (view.phase === "setup_peek" && isOwn) {
      if (!SETUP_PEEK_SLOTS.includes(slot)) return;
      if (view.ownSetupPeekedSlots.includes(slot)) return;
      send({ type: "setup_peek", slot });
      return;
    }

    if (view.canSwap && isOwn) {
      send({ type: "swap", slot });
    }
  };

  const styles = StyleSheet.create({
    scroll: {
      flex: 1,
    },
    content: {
      flexGrow: 1,
      gap: 12,
      padding: 16,
      paddingBottom: 24,
    },
    header: {
      alignItems: "center",
      gap: 4,
    },
    phase: {
      color: tokens.foregroundMuted,
      fontSize: 11,
      fontWeight: "700",
      letterSpacing: 1.5,
      textTransform: "uppercase",
    },
    turn: {
      color: tokens.accent,
      fontSize: 16,
      fontWeight: "700",
    },
    connectionRow: {
      alignItems: "center",
      flexDirection: "row",
      gap: 6,
    },
    connectionDot: {
      borderRadius: 5,
      height: 8,
      width: 8,
    },
    connectionText: {
      color: tokens.foregroundMuted,
      fontSize: 12,
    },
    error: {
      color: tokens.danger,
      fontSize: 14,
      textAlign: "center",
    },
    seats: {
      gap: 10,
    },
  });

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text style={styles.phase}>{phaseLabel}</Text>
        {turnLabel ? <Text style={styles.turn}>{turnLabel}</Text> : null}
        <View style={styles.connectionRow}>
          <View
            style={[
              styles.connectionDot,
              { backgroundColor: connected ? colors.success : tokens.danger },
            ]}
          />
          <Text style={styles.connectionText}>
            {connected ? voice.online : voice.reconnecting}
          </Text>
        </View>
      </View>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <TableDeckArea
        deckCount={view.deckCount}
        discardTop={view.discardTop}
        drawnCard={view.drawnCard}
        hasDrawnCard={view.hasDrawnCard}
        canDrawFromDeck={view.canDrawFromDeck}
        canDraw={view.canDraw}
        canDiscardDrawn={view.canDiscardDrawn}
        canSwap={view.canSwap}
        deckDrawFlash={deckDrawFlash}
        discardDrawFlash={discardDrawFlash}
        onDrawFromDeck={() => send({ type: "draw", source: "deck" })}
        onDrawFromDiscard={() => send({ type: "draw", source: "discard" })}
        onDiscardDrawn={() => send({ type: "discard_drawn" })}
      />

      <View style={styles.seats}>
        {orderedPlayers.map((player) => {
          const isOwn = player.id === view.playerId;
          return (
            <PlayerSeat
              key={player.id}
              player={player}
              viewerId={view.playerId}
              phase={view.phase}
              ownSetupPeekedSlots={isOwn ? view.ownSetupPeekedSlots : []}
              canSwap={isOwn ? view.canSwap : undefined}
              onCardPress={handleCardPress}
            />
          );
        })}
      </View>
    </ScrollView>
  );
}
