import type { Card } from "@cambio/game";
import type { DeckDrawFlash, DiscardDrawFlash } from "@cambio/client";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useExpoTheme } from "@/theme/ExpoThemeProvider";
import { PixelCard } from "./PixelCard";
import { PILE_CARD, TABLE_CARD } from "./card-sizes";

type TableDeckAreaProps = {
  deckCount: number;
  discardTop: Card | null;
  drawnCard: Card | null;
  hasDrawnCard: boolean;
  canDrawFromDeck: boolean;
  canDraw: boolean;
  canDiscardDrawn: boolean;
  canSwap: boolean;
  deckDrawFlash: DeckDrawFlash | null;
  discardDrawFlash: DiscardDrawFlash | null;
  onDrawFromDeck: () => void;
  onDrawFromDiscard: () => void;
  onDiscardDrawn: () => void;
};

export function TableDeckArea({
  deckCount,
  discardTop,
  drawnCard,
  hasDrawnCard,
  canDrawFromDeck,
  canDraw,
  canDiscardDrawn,
  canSwap,
  deckDrawFlash,
  discardDrawFlash,
  onDrawFromDeck,
  onDrawFromDiscard,
  onDiscardDrawn,
}: TableDeckAreaProps) {
  const { tokens, voice } = useExpoTheme();
  const isDrawnSlotMine = Boolean(drawnCard);
  const showDrawnFaceDown = !isDrawnSlotMine && hasDrawnCard;
  const canTakeFromDiscard = canDraw && Boolean(discardTop);
  const canInteractWithDiscard = canTakeFromDiscard || canDiscardDrawn;

  const styles = StyleSheet.create({
    container: {
      backgroundColor: tokens.surface,
      borderColor: canDrawFromDeck ? tokens.accentAlt : tokens.border,
      borderRadius: 12,
      borderWidth: canDrawFromDeck ? 2 : 1,
      gap: 8,
      padding: 12,
    },
    row: {
      alignItems: "flex-end",
      flexDirection: "row",
      justifyContent: "space-around",
    },
    pile: {
      alignItems: "center",
      gap: 4,
    },
    pileLabel: {
      color: tokens.foregroundMuted,
      fontSize: 10,
      fontWeight: "700",
      letterSpacing: 1,
      textTransform: "uppercase",
    },
    pileLabelActive: {
      color: tokens.accentAlt,
    },
    pileLabelDiscard: {
      color: tokens.accent,
    },
    deckFace: {
      alignItems: "center",
      backgroundColor: tokens.surfaceCard,
      borderColor: canDrawFromDeck ? tokens.accentAlt : tokens.borderMuted,
      borderRadius: 8,
      borderWidth: 2,
      height: PILE_CARD.height,
      justifyContent: "center",
      width: PILE_CARD.width,
    },
    deckCount: {
      color: tokens.textOnCard,
      fontSize: 18,
      fontWeight: "800",
    },
    drawnSlot: {
      alignItems: "center",
      gap: 4,
    },
    drawnLabel: {
      color: isDrawnSlotMine ? tokens.accent : hasDrawnCard ? tokens.accentAlt : tokens.foregroundMuted,
      fontSize: 10,
      fontWeight: "700",
      letterSpacing: 1,
      textTransform: "uppercase",
    },
    drawnRing: {
      borderRadius: 10,
      borderWidth: canSwap ? 2 : isDrawnSlotMine ? 1 : 0,
      borderColor: canSwap ? tokens.accent : `${tokens.accent}80`,
      padding: 2,
    },
    flashDeck: {
      borderColor: tokens.accentAlt,
    },
    flashDiscard: {
      borderColor: tokens.accent,
    },
    actionRow: {
      alignItems: "center",
      gap: 8,
    },
    discardButton: {
      backgroundColor: tokens.accentSoft,
      borderRadius: 8,
      paddingHorizontal: 16,
      paddingVertical: 8,
    },
    discardButtonText: {
      color: tokens.background,
      fontSize: 12,
      fontWeight: "700",
      textTransform: "uppercase",
    },
  });

  const handleDiscardPress = () => {
    if (canDiscardDrawn) {
      onDiscardDrawn();
      return;
    }
    if (canTakeFromDiscard) {
      onDrawFromDiscard();
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.row}>
        <Pressable
          style={styles.pile}
          onPress={onDrawFromDeck}
          disabled={!canDrawFromDeck}
          accessibilityLabel={voice.draw}
        >
          <Text style={[styles.pileLabel, canDrawFromDeck && styles.pileLabelActive]}>
            {voice.deck}
          </Text>
          <View style={[styles.deckFace, deckDrawFlash && styles.flashDeck]}>
            <Text style={styles.deckCount}>{deckCount}</Text>
          </View>
        </Pressable>

        <View style={styles.drawnSlot}>
          <Text style={styles.drawnLabel}>{voice.drawn}</Text>
          <View style={styles.drawnRing}>
            <PixelCard
              card={drawnCard}
              faceUp={isDrawnSlotMine}
              hidden={showDrawnFaceDown}
              empty={!isDrawnSlotMine && !hasDrawnCard}
              size={TABLE_CARD}
            />
          </View>
        </View>

        <Pressable
          style={styles.pile}
          onPress={handleDiscardPress}
          disabled={!canInteractWithDiscard}
          accessibilityLabel={canDiscardDrawn ? voice.discardDrawn : voice.take}
        >
          <Text
            style={[
              styles.pileLabel,
              canInteractWithDiscard && styles.pileLabelDiscard,
            ]}
          >
            {voice.discard}
          </Text>
          <View style={discardDrawFlash ? styles.flashDiscard : undefined}>
            <PixelCard
              card={discardTop}
              faceUp
              empty={!discardTop}
              size={PILE_CARD}
              highlightAction={canTakeFromDiscard && !canDiscardDrawn}
            />
          </View>
        </Pressable>
      </View>

      {canDiscardDrawn ? (
        <View style={styles.actionRow}>
          <Pressable style={styles.discardButton} onPress={onDiscardDrawn}>
            <Text style={styles.discardButtonText}>{voice.discardDrawn}</Text>
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}
