"use client";

import type { ReactNode } from "react";
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
  swapFlashing?: boolean;
  swapFlashSlotLabel?: string;
  isPenalty?: boolean;
  empty?: boolean;
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
  whileHover: { scale: 1.02 },
  whileTap: { scale: 0.98 },
  transition: { type: "spring" as const, stiffness: 500, damping: 32 },
};

function SwapFlashOverlay({ small, slotLabel }: { small: boolean; slotLabel?: string }) {
  return (
    <div className="absolute inset-0 z-30 flex flex-col items-center justify-center rounded-card pointer-events-none overflow-hidden">
      <div className="absolute inset-0 bg-accent/65" />
      <div className="absolute inset-0 bg-gradient-to-br from-accent-alt/70 via-white/25 to-accent/70 swap-flash-shimmer" />
      <div className="absolute inset-0 border-4 border-accent swap-flash-ring" />
      {slotLabel && (
        <span className="relative mb-1 font-display font-bold text-[8px] sm:text-[9px] text-white/90 tracking-wider">
          {slotLabel}
        </span>
      )}
      <span
        className={`relative font-display font-bold text-white drop-shadow-[0_2px_10px_rgba(0,0,0,0.7)] swap-flash-icon ${
          small ? "text-3xl" : "text-5xl"
        }`}
      >
        ↔
      </span>
      <span className="relative mt-1 font-display font-bold text-[8px] sm:text-[9px] text-white tracking-widest swap-flash-label">
        SWAP
      </span>
    </div>
  );
}

function CardShell({
  size,
  swapFlashing,
  swapFlashSlotLabel,
  interactive,
  onClick,
  disabled,
  flipAnimation,
  baseClass,
  faceClass,
  children,
}: {
  size: string;
  swapFlashing: boolean;
  swapFlashSlotLabel?: string;
  interactive: boolean;
  onClick?: () => void;
  disabled: boolean;
  flipAnimation: object;
  baseClass: string;
  faceClass: string;
  children: ReactNode;
}) {
  const { transition: flipTransition, animate: flipAnimate, ...flipRest } =
    flipAnimation as {
      transition?: object;
      animate?: object;
      [key: string]: unknown;
    };

  return (
    <div className={`${size} relative shrink-0 ${swapFlashing ? "swap-flash-wrap" : ""}`}>
      <motion.button
        type="button"
        onClick={onClick}
        disabled={disabled || !onClick}
        className={`${baseClass} absolute inset-0 ${faceClass}`}
        style={{ transformStyle: "preserve-3d", perspective: 800 }}
        {...flipRest}
        {...(interactive && !swapFlashing ? motionProps : {})}
        animate={
          swapFlashing
            ? { scale: [1, 1.14, 1.08, 1.12, 1], rotate: [0, -6, 6, -3, 0] }
            : { scale: 1, rotate: 0, ...flipAnimate }
        }
        transition={
          swapFlashing
            ? { duration: 2.6, times: [0, 0.15, 0.4, 0.7, 1], ease: "easeOut" }
            : (flipTransition ?? { duration: 0.2 })
        }
      >
        {children}
      </motion.button>
      {swapFlashing && (
        <SwapFlashOverlay small={size.includes("w-14")} slotLabel={swapFlashSlotLabel} />
      )}
    </div>
  );
}

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
  swapFlashing = false,
  swapFlashSlotLabel,
  isPenalty = false,
  empty = false,
  revealing = false,
  onClick,
  disabled = false,
}: PixelCardProps) {
  const size = small ? "w-14 h-20 text-[10px]" : `${TABLE_CARD_SIZE} text-xs`;

  if (empty) {
    return (
      <div
        className={`${size} shrink-0 pixel-border rounded-card border-dashed relative overflow-hidden ${
          swapFlashing
            ? "swap-flash-wrap border-accent border-solid"
            : "border-theme-muted/35 bg-surface/40"
        }`}
        aria-hidden={!swapFlashing}
      >
        {swapFlashing && (
          <SwapFlashOverlay small={small} slotLabel={swapFlashSlotLabel} />
        )}
      </div>
    );
  }

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
    ? "ring-4 ring-accent-alt shadow-glow-accent-alt z-10 animate-swap-selected"
    : "";

  const baseClass = `${size} pixel-border rounded-card relative overflow-hidden ${selected ? "ring-2 ring-accent-alt" : ""} ${swapGlow} ${actionGlow} ${snapGlow} ${firstSelectedGlow} ${isPenalty ? "border-accent shadow-glow-accent" : ""} ${interactive ? "cursor-pointer" : ""} disabled:opacity-60`;

  const flipAnimation = revealing
    ? {
        initial: { rotateY: -90, opacity: 0.5 },
        animate: { rotateY: 0, opacity: 1 },
        transition: { duration: 0.3, ease: [0.22, 1, 0.36, 1] as const },
      }
    : {
        initial: false as const,
        animate: { rotateY: 0, opacity: 1 },
      };

  if (!showFace) {
    return (
      <CardShell
        size={size}
        swapFlashing={swapFlashing}
        swapFlashSlotLabel={swapFlashSlotLabel}
        interactive={interactive}
        onClick={onClick}
        disabled={disabled}
        flipAnimation={flipAnimation}
        baseClass={baseClass}
        faceClass="bg-surface-card"
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
      </CardShell>
    );
  }

  const red = card ? isRed(card) : false;
  const color = red ? "card-red" : "card-black";

  return (
    <CardShell
      size={size}
      swapFlashing={swapFlashing}
      swapFlashSlotLabel={swapFlashSlotLabel}
      interactive={interactive}
      onClick={onClick}
      disabled={disabled}
      flipAnimation={flipAnimation}
      baseClass={baseClass}
      faceClass={`bg-surface-card-alt ${color} flex flex-col items-center justify-center gap-1`}
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
    </CardShell>
  );
}
