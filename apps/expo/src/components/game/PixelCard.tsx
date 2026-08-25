import { cardLabel, isRed, type Card } from "@cambio/game";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useExpoTheme } from "@/theme/ExpoThemeProvider";
import { CARD_ASPECT, HAND_CARD } from "./card-sizes";

const SUIT_GLYPH: Record<string, string> = {
  hearts: "♥",
  diamonds: "♦",
  clubs: "♣",
  spades: "♠",
  joker: "★",
};

export type PixelCardSize = {
  width: number;
  height: number;
};

type PixelCardProps = {
  card: Card | null;
  hidden?: boolean;
  faceUp?: boolean;
  empty?: boolean;
  size?: PixelCardSize;
  highlightSwap?: boolean;
  highlightAction?: boolean;
  onPress?: () => void;
  disabled?: boolean;
};

export function PixelCard({
  card,
  hidden = false,
  faceUp = false,
  empty = false,
  size = HAND_CARD,
  highlightSwap = false,
  highlightAction = false,
  onPress,
  disabled = false,
}: PixelCardProps) {
  const { tokens } = useExpoTheme();
  const styles = useCardStyles(tokens, size);

  if (empty) {
    return (
      <View style={[styles.shell, styles.emptyShell]} accessibilityElementsHidden />
    );
  }

  const showFace = card && !hidden && (faceUp || !hidden);
  const interactive = Boolean(onPress && !disabled);
  const shellStyle = [
    styles.shell,
    highlightSwap && styles.highlightSwap,
    highlightAction && styles.highlightAction,
    disabled && styles.disabled,
  ];

  if (!showFace) {
    const backHint = highlightAction ? "◎" : highlightSwap ? "↔" : "?";
    const content = (
      <View style={[shellStyle, styles.backShell]}>
        <View style={styles.backGradient} />
        <View style={styles.backInner}>
          <Text style={styles.backHint}>{backHint}</Text>
        </View>
      </View>
    );

    if (!interactive) return content;

    return (
      <Pressable onPress={onPress} disabled={disabled} style={({ pressed }) => pressed && styles.pressed}>
        {content}
      </Pressable>
    );
  }

  const red = card ? isRed(card) : false;
  const suitColor = red ? tokens.cardRed : tokens.cardBlack;
  const fontScale = size.width / HAND_CARD.width;

  const faceContent = (
    <View style={[shellStyle, styles.faceShell]}>
      <Text style={[styles.rank, { color: suitColor, fontSize: 14 * fontScale }]}>
        {card ? cardLabel(card) : ""}
      </Text>
      <Text style={[styles.suit, { color: suitColor, fontSize: 18 * fontScale }]}>
        {card ? SUIT_GLYPH[card.suit] : ""}
      </Text>
    </View>
  );

  if (!interactive) return faceContent;

  return (
    <Pressable onPress={onPress} disabled={disabled} style={({ pressed }) => pressed && styles.pressed}>
      {faceContent}
    </Pressable>
  );
}

function useCardStyles(
  tokens: ReturnType<typeof useExpoTheme>["tokens"],
  size: PixelCardSize,
) {
  const borderRadius = Math.max(6, Math.round(size.width * 0.12));
  const borderWidth = Math.max(2, Math.round(size.width * 0.04));

  return StyleSheet.create({
    shell: {
      width: size.width,
      height: size.height,
      borderRadius,
      borderWidth,
      borderColor: tokens.borderMuted,
      overflow: "hidden",
    },
    emptyShell: {
      backgroundColor: `${tokens.surface}66`,
      borderStyle: "dashed",
      borderColor: tokens.borderMuted,
    },
    backShell: {
      backgroundColor: tokens.surfaceCard,
    },
    faceShell: {
      backgroundColor: tokens.surfaceCardAlt,
      alignItems: "center",
      justifyContent: "center",
      gap: 2,
    },
    backGradient: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: tokens.accentSoft,
      opacity: 0.25,
    },
    backInner: {
      ...StyleSheet.absoluteFillObject,
      margin: size.width * 0.12,
      borderWidth: 2,
      borderStyle: "dashed",
      borderColor: tokens.textOnCard,
      borderRadius: borderRadius - 2,
      alignItems: "center",
      justifyContent: "center",
    },
    backHint: {
      color: tokens.textOnCard,
      fontSize: Math.round(size.width * 0.28),
      fontWeight: "700",
    },
    rank: {
      fontWeight: "800",
      lineHeight: Math.round(size.height * CARD_ASPECT * 0.22),
    },
    suit: {
      lineHeight: Math.round(size.height * 0.28),
    },
    highlightSwap: {
      borderColor: tokens.accent,
      borderWidth: borderWidth + 1,
    },
    highlightAction: {
      borderColor: tokens.accentAlt,
      borderWidth: borderWidth + 1,
    },
    disabled: {
      opacity: 0.55,
    },
    pressed: {
      opacity: 0.85,
      transform: [{ scale: 0.97 }],
    },
  });
}
