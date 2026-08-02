"use client";

import { motion } from "framer-motion";
import type { Card } from "@/game/types";
import { cardLabel, isRed } from "@/game/cards";

export const TABLE_CARD_SIZE = "w-20 h-28";

type PixelCardProps = {
  card: Card | null;
  hidden?: boolean;
  faceUp?: boolean;
  selected?: boolean;
  small?: boolean;
  highlightSwap?: boolean;
  highlightAction?: boolean;
  highlightSnap?: boolean;
  swapFirstSelected?: boolean;
  isPenalty?: boolean;
  revealing?: boolean;
  onClick?: () => void;
  disabled?: boolean;
};

const suitGlyph: Record<string, string> = {
  hearts: "♥",
  diamonds: "♦",
  clubs: "♣",
  spades: "♠",
  joker: "★",
};

const motionProps = {
  whileHover: { scale: 1.05 },
  whileTap: { scale: 0.97 },
  transition: { type: "spring" as const, stiffness: 420, damping: 28 },
};

export function PixelCard({
  card,
  hidden = false,
  faceUp = false,
  selected = false,
  small = false,
  highlightSwap = false,
  highlightAction = false,
  highlightSnap = false,
  swapFirstSelected = false,
  isPenalty = false,
  revealing = false,
  onClick,
  disabled = false,
}: PixelCardProps) {
  const size = small ? "w-14 h-20 text-[10px]" : `${TABLE_CARD_SIZE} text-xs`;
  const showFace = card && !hidden && (faceUp || !hidden);
  const interactive = Boolean(onClick && !disabled);

  const swapGlow = highlightSwap
    ? "ring-2 ring-accent animate-pulse shadow-glow-accent cursor-pointer"
    : "";
  const actionGlow = highlightAction
    ? "ring-2 ring-accent-alt animate-pulse shadow-glow-accent-alt cursor-pointer"
    : "";
  const snapGlow = highlightSnap
    ? "hover:ring-2 hover:ring-danger/70 cursor-pointer"
    : "";
  const firstSelectedGlow = swapFirstSelected
    ? "ring-4 ring-accent-alt scale-110 shadow-glow-accent-alt z-10 animate-swap-selected"
    : "";

  const baseClass = `${size} pixel-border rounded-card relative overflow-hidden ${selected ? "ring-2 ring-accent-alt scale-105" : ""} ${swapGlow} ${actionGlow} ${snapGlow} ${firstSelectedGlow} ${isPenalty ? "border-accent shadow-glow-accent" : ""} ${interactive ? "cursor-pointer" : ""} disabled:opacity-60`;

  const flipAnimation = revealing
    ? {
        initial: { rotateY: -90, opacity: 0.4, scale: 0.92 },
        animate: { rotateY: 0, opacity: 1, scale: 1 },
        transition: { duration: 0.38, ease: [0.22, 1, 0.36, 1] as const },
      }
    : {
        initial: false as const,
        animate: { rotateY: 0, opacity: 1, scale: 1 },
      };

  if (!showFace) {
    return (
      <motion.button
        type="button"
        layout
        onClick={onClick}
        disabled={disabled || !onClick}
        className={`${baseClass} bg-surface-card`}
        style={{ transformStyle: "preserve-3d", perspective: 800 }}
        {...(interactive ? motionProps : {})}
        {...flipAnimation}
      >
        {swapFirstSelected && (
          <span className="absolute -top-2 -right-2 z-20 ui-badge bg-accent-alt text-[8px] px-1.5 py-0.5 rounded-full shadow-glow-accent-alt">
            1
          </span>
        )}
        <div
          className={`absolute inset-0 ${isPenalty ? "bg-danger-surface/80" : "opacity-80"}`}
          style={{
            background: isPenalty
              ? undefined
              : "linear-gradient(135deg, color-mix(in srgb, var(--accent) 20%, transparent), color-mix(in srgb, var(--accent-alt) 20%, transparent))",
          }}
        />
        <div
          className={`absolute inset-2 border-2 border-dashed flex items-center justify-center font-display ${isPenalty ? "border-accent text-accent" : "border-theme-muted text-on-card"}`}
        >
          {highlightSnap ? "?" : highlightAction ? "◎" : highlightSwap ? "↔" : isPenalty ? "!" : "?"}
        </div>
      </motion.button>
    );
  }

  const red = card ? isRed(card) : false;
  const color = red ? "card-red" : "card-black";

  return (
    <motion.button
      type="button"
      layout
      onClick={onClick}
      disabled={disabled || !onClick}
      className={`${baseClass} bg-surface-card-alt ${color} flex flex-col items-center justify-center gap-1`}
      style={{ transformStyle: "preserve-3d", perspective: 800 }}
      {...(interactive ? motionProps : {})}
      {...flipAnimation}
    >
      {swapFirstSelected && (
        <span className="absolute -top-2 -right-2 z-20 ui-badge bg-accent-alt text-[8px] px-1.5 py-0.5 rounded-full shadow-glow-accent-alt">
          1
        </span>
      )}
      <span className="font-display leading-none">{card ? cardLabel(card) : ""}</span>
      <span className="text-lg leading-none">
        {card ? suitGlyph[card.suit] : ""}
      </span>
    </motion.button>
  );
}
