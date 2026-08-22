"use client";

import {
  canUseNativeShare,
  hapticClick,
  shareRoomInvite,
  triggerCambioHaptic,
  triggerSnapHaptic,
} from "@cambio/client";
import { AnimatePresence, motion } from "framer-motion";
import {
  AlertTriangle,
  ArrowLeftRight,
  Bell,
  BellOff,
  Check,
  CircleUser,
  Copy,
  Eye,
  GalleryHorizontal,
  LayoutGrid,
  Lightbulb,
  LightbulbOff,
  ListOrdered,
  Loader2,
  LogOut,
  MessageSquare,
  MessageSquareOff,
  MoreHorizontal,
  Share2,
  Volume2,
  VolumeX,
  X,
  Zap,
} from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { PixelCard } from "@/components/cards/PixelCard";
import { CambioCallOverlay } from "@/components/game/CambioCallOverlay";
import { ChatPanel } from "@/components/game/ChatPanel";
import { GameOverScreen } from "@/components/game/GameOverScreen";
import { LobbyPlayers } from "@/components/game/LobbyPlayers";
import { PlayerGridStage } from "@/components/game/PlayerGridStage";
import { PlayerScrollStage } from "@/components/game/PlayerScrollStage";
import { ReshuffleOverlay } from "@/components/game/ReshuffleOverlay";
import { SnapWindowOverlay } from "@/components/game/SnapWindowOverlay";
import { WaitingScreen } from "@/components/game/WaitingScreen";
import { TutorialCoach } from "@/components/tutorial/TutorialCoach";
import {
  GameToast,
  type GameToastItem,
  GameToastLayer,
} from "@/components/ui/GameToastLayer";
import { RetroButton } from "@/components/ui/RetroButton";
import { ThemePicker } from "@/components/ui/ThemePicker";
import { abilityForDiscard } from "@/game/cards";
import type {
  ClientMessage,
  PendingAbility,
  PlayerView,
  PublicCardSlot,
  PublicPlayer,
} from "@/game/types";
import { HAND_BASE_SLOTS, SETUP_PEEK_SLOTS } from "@/game/types";
import { useChatNotifications } from "@/hooks/useChatNotifications";
import { useDebugEnabled } from "@/hooks/useDebugEnabled";
import type {
  CambioFlash,
  DeckDrawFlash,
  DiscardDrawFlash,
  FleetingPeek,
  PeekFlash,
  PenaltyFlash,
  ReshuffleFlash,
  SnapFlash,
  SwapFlash,
  TakeFlash,
} from "@/hooks/useGameConnection";
import { useGameSounds } from "@/hooks/useGameSounds";
import { useSeatHandFit } from "@/hooks/useSeatHandFit";
import { useThemeVoice } from "@/hooks/useThemeVoice";
import { useTutorial } from "@/hooks/useTutorial";
import { copyToClipboard } from "@/lib/clipboard";
import {
  COACH_HINT_IDS,
  coachHintForClientMessage,
  isCoachEligiblePhase,
  nextCoachHint,
} from "@/lib/coach-moments";
import {
  carouselPenaltyColumns,
  carouselPenaltyPosition,
  nearSquareGridPosition,
  nearSquareGridShape,
} from "@/lib/penalty-grid";
import type { ThemeVoice } from "@/lib/themes";
import { useTutorialStore } from "@/store/tutorial-prefs";
import { useRehydrateUiPrefs, useUiPrefs } from "@/store/ui-prefs";

type GameTableProps = {
  view: PlayerView;
  connected: boolean;
  error: string | null;
  fleetingPeek: FleetingPeek | null;
  peekFlash: PeekFlash | null;
  swapFlash: SwapFlash | null;
  takeFlash: TakeFlash | null;
  snapFlash: SnapFlash | null;
  penaltyFlash: PenaltyFlash | null;
  cambioFlash: CambioFlash | null;
  reshuffleFlash: ReshuffleFlash | null;
  discardDrawFlash: DiscardDrawFlash | null;
  deckDrawFlash: DeckDrawFlash | null;
  send: (message: ClientMessage) => void;
};

type SelectedCard = { playerId: string; slot: number };

const LOBBY_JOIN_TOAST_MS = 3000;
const CHROME_ICON_CLASS = "size-3.5 shrink-0";
const CHROME_ICON_BTN =
  "chip-btn chip-btn-sm inline-flex items-center justify-center px-1.5 border-theme-muted text-theme hover:border-accent transition-colors";

function formatPeekFlashNotice(
  peekFlash: PeekFlash,
  players: PlayerView["players"],
  fallback: string,
): string {
  const actor = players.find((entry) => entry.id === peekFlash.actorId);
  const target = players.find((entry) => entry.id === peekFlash.playerId);
  const actorName = actor?.name ?? "";
  const targetName = target?.name ?? "";
  const slotLabel = `#${peekFlash.slot + 1}`;

  if (peekFlash.kind === "spy") {
    return `◎ ${actorName} spied ${targetName} ${slotLabel}`;
  }
  if (peekFlash.kind === "look") {
    return `◎ ${actorName} looked at ${targetName} ${slotLabel}`;
  }
  if (peekFlash.actorId === peekFlash.playerId) {
    return `◎ ${actorName} peeked ${slotLabel}`;
  }
  return fallback;
}

function isPeekFlashing(
  peekFlash: PeekFlash | null,
  playerId: string,
  slot: number,
): boolean {
  return peekFlash?.playerId === playerId && peekFlash.slot === slot;
}

function peekFlashSeatLabel(kind: PeekFlash["kind"]): string {
  if (kind === "spy") return "SPY";
  if (kind === "look") return "LOOK";
  return "PEEK";
}

function isSwapFlashing(
  swapFlash: SwapFlash | null,
  playerId: string,
  slot: number,
): boolean {
  return (
    swapFlash?.slots.some(
      (entry) => entry.playerId === playerId && entry.slot === slot,
    ) ?? false
  );
}

function isTakeFlashing(
  takeFlash: TakeFlash | null,
  playerId: string,
  slot: number,
): boolean {
  return takeFlash?.playerId === playerId && takeFlash.slot === slot;
}

function isSnapFlashing(
  snapFlash: SnapFlash | null,
  playerId: string,
  slot: number,
): boolean {
  return snapFlash?.playerId === playerId && snapFlash.slot === slot;
}

function formatSnapFlashNotice(
  snapFlash: SnapFlash,
  players: PlayerView["players"],
  fallback: string,
): string {
  const actor = players.find((entry) => entry.id === snapFlash.actorId);
  const target = players.find((entry) => entry.id === snapFlash.playerId);
  const slotLabel = `#${snapFlash.slot + 1}`;
  if (actor && target && actor.id === target.id) {
    return `✦ ${actor.name} snapped ${slotLabel}`;
  }
  if (actor && target) {
    return `✦ ${actor.name} snapped ${target.name} ${slotLabel}`;
  }
  return fallback;
}

function formatSwapFlashNotice(
  swapFlash: SwapFlash,
  players: PlayerView["players"],
  fallback: string,
): string {
  const parts = swapFlash.slots.map(({ playerId, slot }) => {
    const player = players.find((entry) => entry.id === playerId);
    const label = `#${slot + 1}`;
    return player ? `${player.name} ${label}` : label;
  });

  if (parts.length >= 2) {
    return `↔ ${parts.join("  ↔  ")}`;
  }
  if (parts.length === 1) {
    return `↔ ${parts[0]}`;
  }
  return fallback;
}

function formatPenaltyFlashNotice(
  penaltyFlash: PenaltyFlash,
  players: PlayerView["players"],
  fallback: string,
): string {
  const player = players.find((entry) => entry.id === penaltyFlash.playerId);
  if (!player) return fallback;
  return `! ${player.name} drew a penalty card (#${penaltyFlash.slot + 1})`;
}

function isSwapAbility(kind: string | undefined) {
  return (
    kind === "blind_switch" || kind === "queen_swap" || kind === "king_swap"
  );
}

function isLookAbility(kind: string | undefined) {
  return (
    kind === "peek_own" ||
    kind === "spy" ||
    kind === "queen_look" ||
    kind === "king_look"
  );
}

const TABLE_CARD_RATIO = 5 / 7;
const TABLE_DRAWN_TO_PILE = 1.38;

function applyTableCardScale(el: HTMLElement) {
  const styles = getComputedStyle(el);
  const padY =
    (Number.parseFloat(styles.paddingTop) || 0) +
    (Number.parseFloat(styles.paddingBottom) || 0);
  const padX =
    (Number.parseFloat(styles.paddingLeft) || 0) +
    (Number.parseFloat(styles.paddingRight) || 0);

  const hint = el.querySelector<HTMLElement>("[data-table-hint]");
  const chrome = el.querySelector<HTMLElement>("[data-table-chrome]");
  const event = el.querySelector<HTMLElement>("[data-table-event]");
  const reserved =
    (hint?.offsetHeight ?? 0) +
    (chrome?.offsetHeight ?? 0) +
    (event?.offsetHeight ?? 0) +
    28;

  const availH = Math.max(72, el.clientHeight - padY - reserved);
  const availW = Math.max(120, el.clientWidth - padX);
  const labelBudget = 22;
  const gapBudget = 56;

  let drawnH = Math.min(availH - labelBudget, availH * 0.88);
  let drawnW = drawnH * TABLE_CARD_RATIO;
  const maxDrawnW = (availW - gapBudget) / (1 + 2 / TABLE_DRAWN_TO_PILE);
  if (drawnW > maxDrawnW) {
    drawnW = maxDrawnW;
    drawnH = drawnW / TABLE_CARD_RATIO;
  }

  drawnH = Math.min(200, Math.max(88, drawnH));
  drawnW = drawnH * TABLE_CARD_RATIO;
  let pileH = drawnH / TABLE_DRAWN_TO_PILE;
  pileH = Math.min(148, Math.max(64, pileH));
  const pileW = pileH * TABLE_CARD_RATIO;

  el.style.setProperty("--table-drawn-w", `${drawnW}px`);
  el.style.setProperty("--table-drawn-h", `${drawnH}px`);
  el.style.setProperty("--table-pile-w", `${pileW}px`);
  el.style.setProperty("--table-pile-h", `${pileH}px`);
}

function getActionBanner(
  view: PlayerView,
  voice: ThemeVoice,
  swapAbilityActive: boolean,
  selectedSwapCard: SelectedCard | null,
  snapWindowSeconds: number | null,
): { text: string; tone: "swap" | "action" | "snap" | "turn" } | null {
  if (view.phase === "snap_window" && snapWindowSeconds !== null) {
    return {
      text: voice.snapWindowHint(snapWindowSeconds),
      tone: "snap",
    };
  }

  if (view.phase === "revealed") {
    return {
      text: view.canShowResults
        ? voice.revealedHostHint
        : voice.waitingForResults,
      tone: "action",
    };
  }

  if (swapAbilityActive) {
    return {
      text: selectedSwapCard
        ? voice.swapAbilityFirstSelected
        : voice.swapAbilityHint,
      tone: "swap",
    };
  }

  const pending = view.pendingAbility;
  if (pending?.kind === "peek_own") {
    return { text: voice.peekOwnHint, tone: "action" };
  }
  if (pending?.kind === "spy") {
    return { text: voice.spyHint, tone: "action" };
  }
  if (pending?.kind === "queen_look") {
    return { text: voice.queenLookHint, tone: "action" };
  }
  if (pending?.kind === "king_look") {
    const remaining = pending.maxLooks - pending.lookedCards.length;
    return { text: voice.kingLookHint(remaining), tone: "action" };
  }
  if (pending?.kind === "snap_give") {
    return { text: voice.snapGiveHint, tone: "turn" };
  }

  if (view.phase === "setup_peek") {
    return { text: voice.setupPeekHint, tone: "action" };
  }
  if (view.canSwap) {
    return {
      text: view.drawnFromDiscard
        ? voice.swapHintRequired
        : voice.swapHintOptional,
      tone: "turn",
    };
  }
  if (view.canDraw) {
    return {
      text: view.canCallCambio ? voice.drawOrCambioHint : voice.drawHint,
      tone: "turn",
    };
  }
  if (view.canDiscardDrawn) {
    const ability = view.drawnCard ? abilityForDiscard(view.drawnCard) : null;
    return {
      text: ability ? voice.discardAbilityHint[ability] : voice.discardHint,
      tone: "turn",
    };
  }
  if (view.canSnap) {
    return { text: voice.snapHint, tone: "snap" };
  }

  return null;
}

function PlayerSeat({
  player,
  viewerId,
  phase,
  cambioCallerId,
  ownSetupPeekedSlots,
  fleetingPeek,
  peekFlash,
  swapFlash,
  takeFlash,
  snapFlash,
  penaltyFlash,
  selectedSwapCard,
  canSwap,
  canSnap,
  snapGiveActive,
  snapGivePending,
  swapAbilityActive,
  lookAbilityActive,
  pendingLookKind,
  compact = false,
  fitHandToWidth = false,
  voice,
  onCardClick,
}: {
  player: PublicPlayer;
  viewerId: string;
  phase: PlayerView["phase"];
  cambioCallerId: string | null;
  ownSetupPeekedSlots: number[];
  fleetingPeek: FleetingPeek | null;
  peekFlash: PeekFlash | null;
  swapFlash: SwapFlash | null;
  takeFlash: TakeFlash | null;
  snapFlash: SnapFlash | null;
  penaltyFlash: PenaltyFlash | null;
  selectedSwapCard: SelectedCard | null;
  canSwap?: boolean;
  canSnap?: boolean;
  snapGiveActive?: boolean;
  snapGivePending?: boolean;
  swapAbilityActive?: boolean;
  lookAbilityActive?: boolean;
  pendingLookKind?: PendingAbility["kind"] | null;
  compact?: boolean;
  fitHandToWidth?: boolean;
  voice: ThemeVoice;
  onCardClick: (playerId: string, slot: number, isOwn: boolean) => void;
}) {
  const isOwn = player.id === viewerId;
  const showDrawnSwapHint = isOwn && canSwap;
  const showSnapGiveHint = isOwn && snapGiveActive;
  const setupPeeksRemaining = Math.max(
    0,
    SETUP_PEEK_SLOTS.length - ownSetupPeekedSlots.length,
  );
  const showSetupPeekHint =
    phase === "setup_peek" && isOwn && setupPeeksRemaining > 0;
  const isProtectedTarget =
    phase === "cambio_final" &&
    cambioCallerId === player.id &&
    player.id !== viewerId;
  const canPickForAbility = swapAbilityActive && (!isProtectedTarget || isOwn);
  const showAbilitySwapHint = swapAbilityActive && canPickForAbility;
  const showSnapTarget =
    canSnap && !snapGivePending && (!isProtectedTarget || isOwn);
  const hasSwapFirstSelected =
    swapAbilityActive && selectedSwapCard?.playerId === player.id;

  const canPickForLook = (slotIndex: number) => {
    if (!lookAbilityActive || !pendingLookKind) return false;
    if (player.hand[slotIndex]?.empty) return false;
    if (pendingLookKind === "peek_own") return isOwn;
    if (pendingLookKind === "spy") return !isOwn && !isProtectedTarget;
    if (pendingLookKind === "queen_look" || pendingLookKind === "king_look") {
      return !isProtectedTarget || isOwn;
    }
    return false;
  };

  const showLookSeatHint =
    lookAbilityActive && player.hand.some((_, index) => canPickForLook(index));

  const hasSwapFlash =
    swapFlash?.slots.some((entry) => entry.playerId === player.id) ?? false;
  const hasSnapFlash =
    snapFlash?.playerId === player.id || snapFlash?.actorId === player.id;
  const hasPeekFlash =
    peekFlash?.playerId === player.id || peekFlash?.actorId === player.id;
  const hasPenaltyFlash = penaltyFlash?.playerId === player.id;

  const seatPadding = "p-1.5 sm:p-2 lg:p-2.5";

  const isPenaltyColumnSlot = (index: number) => index >= HAND_BASE_SLOTS;

  const baseGridSlots = Array.from({ length: HAND_BASE_SLOTS }, (_, index) => {
    const slot = player.hand[index] ?? {
      card: null,
      faceUp: false,
      hidden: false,
      empty: true,
    };
    return { slot, index };
  });

  const penaltySlots = player.hand
    .map((slot, index) => ({ slot, index }))
    .filter(({ slot, index }) => !slot.empty && isPenaltyColumnSlot(index));
  const packedSlots = [...baseGridSlots, ...penaltySlots];
  const packedShape = nearSquareGridShape(packedSlots.length);

  const { seatRef, clipRef, shellRef, handRef } = useSeatHandFit(
    fitHandToWidth,
    `${packedSlots.length}:${packedShape.rows}:${packedShape.cols}`,
  );

  const renderHandSlot = (slot: PublicCardSlot, index: number) => {
    const isEmpty = !!slot.empty;
    const isFleetingPeek =
      fleetingPeek?.playerId === player.id && fleetingPeek.slot === index;
    const alreadySetupPeeked = isOwn && ownSetupPeekedSlots.includes(index);
    const setupLocked =
      phase === "setup_peek" &&
      (!isOwn ||
        !SETUP_PEEK_SLOTS.includes(index) ||
        isEmpty ||
        alreadySetupPeeked);
    const abilityLocked = swapAbilityActive && !canPickForAbility;
    const lookLocked = lookAbilityActive && !canPickForLook(index);
    const canPickForSnapGive = Boolean(snapGiveActive && isOwn && !isEmpty);
    const snapGiveLocked = Boolean(snapGivePending) && !canPickForSnapGive;
    const isSelectedForSwap =
      selectedSwapCard?.playerId === player.id &&
      selectedSwapCard.slot === index;
    const canInteract =
      canPickForSnapGive ||
      (!snapGivePending && !isEmpty) ||
      (showDrawnSwapHint && isOwn) ||
      (showAbilitySwapHint && !abilityLocked);

    const isPeekFlashOnSlot = isPeekFlashing(peekFlash, player.id, index);
    const showPeekFlashOverlay = isPeekFlashOnSlot && !isFleetingPeek;
    const showPenalty =
      penaltyFlash?.playerId === player.id && penaltyFlash.slot === index;
    const cardLocked =
      setupLocked ||
      abilityLocked ||
      lookLocked ||
      snapGiveLocked ||
      !canInteract;

    return (
      <PixelCard
        key={`hand-${index}`}
        card={isFleetingPeek ? fleetingPeek.card : slot.card}
        empty={isEmpty && !isFleetingPeek}
        hidden={!isFleetingPeek && slot.hidden}
        faceUp={isFleetingPeek || slot.faceUp}
        revealing={isFleetingPeek}
        small={compact}
        sizeClass={fitHandToWidth ? undefined : "seat-hand-card"}
        swapFirstSelected={isSelectedForSwap && swapAbilityActive}
        swapFlashing={isSwapFlashing(swapFlash, player.id, index)}
        swapFlashSlotLabel={
          isSwapFlashing(swapFlash, player.id, index)
            ? `#${index + 1}`
            : undefined
        }
        takeFlashing={isTakeFlashing(takeFlash, player.id, index)}
        takeFlashSlotLabel={
          isTakeFlashing(takeFlash, player.id, index)
            ? `#${index + 1}`
            : undefined
        }
        snapFlashing={isSnapFlashing(snapFlash, player.id, index)}
        snapFlashSlotLabel={
          isSnapFlashing(snapFlash, player.id, index)
            ? `#${index + 1}`
            : undefined
        }
        peekFlashing={showPeekFlashOverlay}
        peekFlashKind={showPeekFlashOverlay ? peekFlash?.kind : undefined}
        peekFlashSlotLabel={showPeekFlashOverlay ? `#${index + 1}` : undefined}
        highlightSwap={
          !isEmpty &&
          ((showDrawnSwapHint && !setupLocked) ||
            (showSnapGiveHint && !setupLocked) ||
            (showAbilitySwapHint && !setupLocked && !abilityLocked))
        }
        highlightAction={
          !isEmpty &&
          ((showSetupPeekHint &&
            SETUP_PEEK_SLOTS.includes(index) &&
            !setupLocked) ||
            (lookAbilityActive && canPickForLook(index)))
        }
        highlightSnap={
          !isEmpty &&
          showSnapTarget &&
          !setupLocked &&
          !lookAbilityActive &&
          !swapAbilityActive &&
          !snapGivePending
        }
        penaltyFlashing={showPenalty}
        penaltyFlashSlotLabel={showPenalty ? `#${index + 1}` : undefined}
        onClick={
          cardLocked ? undefined : () => onCardClick(player.id, index, isOwn)
        }
        disabled={cardLocked}
      />
    );
  };

  return (
    <section
      ref={seatRef}
      data-tutorial={isOwn ? "own-hand" : undefined}
      className={`pixel-border ${seatPadding} w-full max-w-full shrink-0 flex flex-col items-center text-center ${
        fitHandToWidth ? "h-full min-w-0 min-h-0" : ""
      } ${
        hasSwapFlash
          ? "swap-seat-flash bg-swap-seat-flash ring-2 ring-accent shadow-glow-accent"
          : hasSnapFlash
            ? "snap-seat-flash bg-snap-seat-flash ring-2 ring-danger shadow-glow-accent"
            : hasPeekFlash
              ? "peek-seat-flash bg-peek-seat-flash ring-2 ring-accent-alt shadow-glow-accent-alt"
              : hasPenaltyFlash
                ? "penalty-seat-flash bg-danger-surface/20 ring-2 ring-accent shadow-glow-accent"
                : showDrawnSwapHint || showSnapGiveHint
                  ? "bg-swap-hint ring-2 ring-accent animate-pulse"
                  : showLookSeatHint
                    ? "bg-action-hint ring-2 ring-accent-alt"
                    : showSetupPeekHint
                      ? "bg-action-hint ring-2 ring-accent-alt"
                      : hasSwapFirstSelected
                        ? "bg-swap-first-selected ring-2 ring-accent-alt shadow-glow-accent-alt"
                        : player.isCurrentTurn
                          ? "bg-surface-elevated ring-2 ring-accent-alt"
                          : "bg-surface"
      } ${phase === "setup_peek" && !isOwn ? "opacity-40" : ""} ${
        lookAbilityActive &&
        !showLookSeatHint &&
        !isOwn &&
        pendingLookKind === "peek_own"
          ? "opacity-40"
          : ""
      } ${
        lookAbilityActive &&
        !showLookSeatHint &&
        isOwn &&
        pendingLookKind === "spy"
          ? "opacity-40"
          : ""
      } ${
        isOwn && !showDrawnSwapHint ? "lg:ring-1 lg:ring-accent" : ""
      } ${swapAbilityActive && isProtectedTarget && !isOwn ? "opacity-40" : ""}`}
    >
      <div
        data-seat-header
        className="w-full min-h-9 mb-1 sm:mb-1.5 flex flex-col items-center justify-center gap-1 shrink-0"
      >
        <h2 className="player-name text-[10px] sm:text-xs truncate max-w-full">
          {player.name}
          {isOwn ? " (you)" : ""}
        </h2>
        <div className="flex h-4 flex-nowrap items-center justify-center gap-1 overflow-hidden">
          {hasSwapFlash && (
            <span title="SWAPPED" className="inline-flex shrink-0">
              <ArrowLeftRight
                aria-label="SWAPPED"
                className="size-3 text-accent animate-pulse"
              />
            </span>
          )}
          {hasSnapFlash && (
            <span title="SNAPPED" className="inline-flex shrink-0">
              <Zap
                aria-label="SNAPPED"
                className="size-3 text-danger-text animate-pulse"
              />
            </span>
          )}
          {hasPeekFlash && peekFlash && (
            <span
              title={peekFlashSeatLabel(peekFlash.kind)}
              className="inline-flex shrink-0"
            >
              <Eye
                aria-label={peekFlashSeatLabel(peekFlash.kind)}
                className="size-3 text-accent-alt animate-pulse"
              />
            </span>
          )}
          {hasPenaltyFlash && (
            <span title="PENALTY" className="inline-flex shrink-0">
              <AlertTriangle
                aria-label="PENALTY"
                className="size-3 text-accent animate-pulse"
              />
            </span>
          )}
          {player.isBot && (
            <span className="ui-badge text-accent-alt">{voice.botBadge}</span>
          )}
          {player.isHost && (
            <span className="ui-badge text-accent">{voice.host}</span>
          )}
          {player.isThinking && (
            <span title={voice.botThinking} className="inline-flex shrink-0">
              <Loader2
                aria-label={voice.botThinking}
                className="size-3 text-accent-alt animate-spin"
              />
            </span>
          )}
          {player.hasCalledCambio && (
            <span className="ui-badge text-accent-soft">{voice.cambio}</span>
          )}
          {!player.connected && (
            <span className="ui-badge text-theme-muted">{voice.away}</span>
          )}
          {player.isWaiting && (
            <span className="ui-badge text-theme-muted">
              {voice.waitingBadge}
            </span>
          )}
        </div>
      </div>
      {player.isWaiting && phase !== "lobby" ? (
        <p className="w-full font-display text-[10px] sm:text-xs text-theme-muted py-2">
          {voice.waitingBadge}
        </p>
      ) : fitHandToWidth ? (
        <div
          ref={clipRef}
          className="w-full flex-1 min-h-0 min-w-0 overflow-hidden flex items-center justify-center"
        >
          <div ref={shellRef} className="relative max-w-full shrink-0">
            <div
              ref={handRef}
              className="grid gap-1 lg:gap-1.5 w-fit"
              style={{
                gridTemplateRows: `repeat(${packedShape.rows}, auto)`,
                gridTemplateColumns: `repeat(${packedShape.cols}, auto)`,
              }}
            >
              {packedSlots.map(({ slot, index }, packIndex) => (
                <div
                  key={`packed-${index}`}
                  style={nearSquareGridPosition(packIndex, packedShape.cols)}
                >
                  {renderHandSlot(slot, index)}
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div className="flex flex-row items-end justify-center gap-1 lg:gap-1.5 w-fit max-w-full min-w-0 mx-auto">
          <div className="grid grid-cols-2 gap-1 lg:gap-1.5 shrink-0 seat-hand-grid">
            {baseGridSlots.map(({ slot, index }) =>
              renderHandSlot(slot, index),
            )}
          </div>
          {penaltySlots.length > 0 && (
            <div
              className="grid grid-rows-2 grid-flow-col gap-1 lg:gap-1.5 shrink-0"
              style={{
                gridTemplateColumns: `repeat(${carouselPenaltyColumns(penaltySlots.length)}, auto)`,
              }}
            >
              {penaltySlots.map(({ slot, index }, penaltyIndex) => (
                <div
                  key={`penalty-wrap-${index}`}
                  style={carouselPenaltyPosition(penaltyIndex)}
                >
                  {renderHandSlot(slot, index)}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </section>
  );
}

export function GameTable({
  view,
  connected,
  error,
  fleetingPeek,
  peekFlash,
  swapFlash,
  takeFlash,
  snapFlash,
  penaltyFlash,
  cambioFlash,
  reshuffleFlash,
  discardDrawFlash,
  deckDrawFlash,
  send: dispatch,
}: GameTableProps) {
  useRehydrateUiPrefs();
  const voice = useThemeVoice();
  const {
    soundEnabled,
    toggleSound,
    hintsEnabled,
    toggleHints,
    playerGridEnabled,
    togglePlayerGrid,
    ownSeatProminent,
    toggleOwnSeatDisplay,
    chatNotificationsEnabled,
    eventNotificationsEnabled,
    toggleChatNotifications,
    toggleEventNotifications,
  } = useUiPrefs();
  const { hydrated, gameSeen, markGameSeen, dismissedCoachHints } =
    useTutorial();
  const dismissedCoachHintSet = useMemo(
    () => new Set(dismissedCoachHints),
    [dismissedCoachHints],
  );
  const send = useCallback(
    (message: ClientMessage) => {
      const completed = coachHintForClientMessage(message);
      if (completed) {
        // Call the store directly so React Compiler cannot keep a stale
        // GameTable setState closure across table re-renders.
        useTutorialStore.getState().dismissCoachHint(completed);
      }
      dispatch(message);
    },
    [dispatch],
  );
  const debugEnabled = useDebugEnabled();
  const [selectedSwapCard, setSelectedSwapCard] = useState<SelectedCard | null>(
    null,
  );
  const [roomCopied, setRoomCopied] = useState(false);
  const [roomShared, setRoomShared] = useState(false);
  const [snapWindowSeconds, setSnapWindowSeconds] = useState<number | null>(
    null,
  );
  const [settingsOpen, setSettingsOpen] = useState(false);
  const openSettings = useCallback(() => setSettingsOpen(true), []);
  const { unreadCount, notification, dismissNotification } =
    useChatNotifications({
      messages: view.chatMessages,
      playerId: view.playerId,
      settingsOpen,
      soundEnabled,
      notificationsEnabled: chatNotificationsEnabled,
    });
  const chatToast = useMemo((): GameToastItem | null => {
    if (!notification) return null;
    return {
      id: `chat-${notification.id}`,
      message: voice.chatNotification(
        notification.playerName,
        notification.text,
      ),
      tone: "info",
      action: (
        <button
          type="button"
          onClick={() => {
            hapticClick("selection");
            openSettings();
            dismissNotification();
          }}
          className="chip-btn text-[8px] px-2 py-1 border-accent text-accent hover:border-accent-alt transition-colors"
        >
          {voice.chatOpen}
        </button>
      ),
    };
  }, [notification, voice, openSettings, dismissNotification]);
  const [lobbyJoinToast, setLobbyJoinToast] = useState<GameToastItem | null>(
    null,
  );
  const lobbyPlayersRef = useRef<Set<string>>(new Set());
  const lobbyJoinTimerRef = useRef<number | null>(null);
  const snapHapticKeyRef = useRef<string | null>(null);
  const cambioHapticKeyRef = useRef<string | null>(null);
  const tableDeckRef = useRef<HTMLDivElement>(null);

  useGameSounds(
    view,
    error,
    fleetingPeek,
    peekFlash,
    swapFlash,
    cambioFlash,
    reshuffleFlash,
    snapWindowSeconds,
    takeFlash,
    snapFlash,
  );
  const nativeShareEnabled = canUseNativeShare();

  useEffect(() => {
    if (!snapFlash) {
      snapHapticKeyRef.current = null;
      return;
    }
    const key = `${snapFlash.actorId}-${snapFlash.playerId}-${snapFlash.slot}`;
    if (snapHapticKeyRef.current === key) return;
    snapHapticKeyRef.current = key;
    void triggerSnapHaptic();
  }, [snapFlash]);

  useEffect(() => {
    if (!cambioFlash) {
      cambioHapticKeyRef.current = null;
      return;
    }
    if (cambioHapticKeyRef.current === cambioFlash.playerId) return;
    cambioHapticKeyRef.current = cambioFlash.playerId;
    void triggerCambioHaptic();
  }, [cambioFlash]);

  const swapAbilityActive = isSwapAbility(view.pendingAbility?.kind);
  const snapGiveActive = view.pendingAbility?.kind === "snap_give";
  const snapGivePending = view.snapGivePending;
  const lookAbilityActive = isLookAbility(view.pendingAbility?.kind);
  const pendingLookKind = lookAbilityActive
    ? (view.pendingAbility?.kind ?? null)
    : null;
  const actionBanner = getActionBanner(
    view,
    voice,
    swapAbilityActive,
    selectedSwapCard,
    snapWindowSeconds,
  );
  const coachHint =
    hydrated && !gameSeen
      ? nextCoachHint(
          {
            phase: view.phase,
            canDraw: view.canDrawFromDeck,
            canSnap: view.canSnap,
            canCallCambio: view.canCallCambio,
            hasDiscard: Boolean(view.discardTop),
          },
          dismissedCoachHintSet,
        )
      : null;
  const coachActive = coachHint !== null;

  useEffect(() => {
    if (gameSeen) return;
    if (dismissedCoachHintSet.size === COACH_HINT_IDS.length) {
      markGameSeen();
    }
  }, [dismissedCoachHintSet, gameSeen, markGameSeen]);

  useEffect(() => {
    if (gameSeen || dismissedCoachHintSet.size === 0) return;
    if (!isCoachEligiblePhase(view.phase)) {
      markGameSeen();
    }
  }, [dismissedCoachHintSet.size, gameSeen, markGameSeen, view.phase]);

  const gameToasts = useMemo((): GameToastItem[] => {
    const items: GameToastItem[] = [];

    if (error) {
      items.push({ id: "error", message: error, tone: "error" });
    }

    if (eventNotificationsEnabled) {
      if (view.phase === "lobby" && lobbyJoinToast) {
        items.push(lobbyJoinToast);
      }

      if (swapFlash) {
        items.push({
          id: "swap-flash",
          message: formatSwapFlashNotice(
            swapFlash,
            view.players,
            voice.swapFlashNotice,
          ),
          tone: "swap",
          pulse: true,
        });
      }

      if (snapFlash) {
        items.push({
          id: "snap-flash",
          message: formatSnapFlashNotice(
            snapFlash,
            view.players,
            "✦ Card snapped",
          ),
          tone: "snap",
          pulse: true,
        });
      }

      if (peekFlash) {
        items.push({
          id: "peek-flash",
          message: formatPeekFlashNotice(
            peekFlash,
            view.players,
            voice.peekFlashNotice,
          ),
          tone: "peek",
          pulse: true,
        });
      }

      if (penaltyFlash) {
        items.push({
          id: "penalty-flash",
          message: formatPenaltyFlashNotice(
            penaltyFlash,
            view.players,
            "! Penalty card drawn",
          ),
          tone: "error",
          pulse: true,
        });
      }

      if (deckDrawFlash) {
        const player = view.players.find(
          (p) => p.id === deckDrawFlash.playerId,
        );
        if (player) {
          items.push({
            id: "deck-draw-flash",
            message: `⤴ ${player.name} drew from the deck`,
            tone: "info",
            pulse: true,
          });
        }
      }

      if (discardDrawFlash) {
        const player = view.players.find(
          (p) => p.id === discardDrawFlash.playerId,
        );
        if (player) {
          items.push({
            id: "discard-draw-flash",
            message: voice.discardDrawNotice(player.name),
            tone: "info",
            pulse: true,
          });
        }
      }
    }

    if (chatToast) {
      items.push(chatToast);
    }

    return items;
  }, [
    chatToast,
    deckDrawFlash,
    discardDrawFlash,
    error,
    eventNotificationsEnabled,
    lobbyJoinToast,
    peekFlash,
    penaltyFlash,
    snapFlash,
    swapFlash,
    view.phase,
    view.players,
    voice,
  ]);

  const actionToast: GameToastItem | null =
    hintsEnabled && actionBanner && !coachActive
      ? {
          id: "action",
          message: actionBanner.text,
          tone: actionBanner.tone,
          pulse: swapAbilityActive && !!selectedSwapCard,
          action:
            swapAbilityActive && selectedSwapCard ? (
              <button
                type="button"
                onClick={() => {
                  hapticClick("selection");
                  setSelectedSwapCard(null);
                }}
                className="chip-btn text-[8px] px-2 py-1 border-accent-alt text-accent-alt hover:border-accent transition-colors"
              >
                {voice.swapAbilityCancel}
              </button>
            ) : undefined,
        }
      : null;

  const showDrawnActionChrome =
    Boolean(view.drawnCard) &&
    !snapGivePending &&
    (view.canSwap || view.canDiscardDrawn);

  useEffect(() => {
    if (view.phase === "lobby") return;
    const el = tableDeckRef.current;
    if (!el) return;

    const clearScaleVars = () => {
      el.style.removeProperty("--table-drawn-w");
      el.style.removeProperty("--table-drawn-h");
      el.style.removeProperty("--table-pile-w");
      el.style.removeProperty("--table-pile-h");
    };

    // Grid view prioritizes seeing player cards — no panel-filling scale.
    if (playerGridEnabled) {
      clearScaleVars();
      return;
    }

    const update = () => applyTableCardScale(el);
    update();
    const frame = requestAnimationFrame(update);
    const observer = new ResizeObserver(update);
    observer.observe(el);

    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      clearScaleVars();
    };
  }, [view.phase, playerGridEnabled]);

  useEffect(() => {
    if (view.phase !== "lobby") {
      lobbyPlayersRef.current = new Set(
        view.players
          .filter((player) => !player.isWaiting)
          .map((player) => player.id),
      );
      setLobbyJoinToast(null);
      if (lobbyJoinTimerRef.current) {
        window.clearTimeout(lobbyJoinTimerRef.current);
        lobbyJoinTimerRef.current = null;
      }
      return;
    }

    const activePlayers = view.players.filter((player) => !player.isWaiting);
    const previous = lobbyPlayersRef.current;
    const newcomer = activePlayers.find(
      (player) => !previous.has(player.id) && player.id !== view.playerId,
    );

    lobbyPlayersRef.current = new Set(activePlayers.map((player) => player.id));

    if (previous.size > 0 && newcomer) {
      setLobbyJoinToast({
        id: `lobby-join-${newcomer.id}`,
        message: voice.playerJoined(newcomer.name),
        tone: "info",
      });
      if (lobbyJoinTimerRef.current) {
        window.clearTimeout(lobbyJoinTimerRef.current);
      }
      lobbyJoinTimerRef.current = window.setTimeout(() => {
        setLobbyJoinToast(null);
        lobbyJoinTimerRef.current = null;
      }, LOBBY_JOIN_TOAST_MS);
    }
  }, [view.phase, view.playerId, view.players, voice]);

  useEffect(() => {
    const snapWindowEndsAt = view.snapWindowEndsAt;
    if (view.phase !== "snap_window" || !snapWindowEndsAt) {
      setSnapWindowSeconds(null);
      return;
    }

    const update = () => {
      const remaining = Math.max(
        0,
        Math.ceil((snapWindowEndsAt - Date.now()) / 1000),
      );
      setSnapWindowSeconds(remaining);
    };

    update();
    const timer = window.setInterval(update, 250);
    return () => window.clearInterval(timer);
  }, [view.phase, view.snapWindowEndsAt]);

  useEffect(() => {
    if (!swapAbilityActive) {
      setSelectedSwapCard(null);
    }
  }, [swapAbilityActive]);

  const playersInTurnOrder = useMemo(
    () => view.players.filter((player) => !player.isWaiting),
    [view.players],
  );

  const playersInGridOrder = useMemo(() => {
    const selfIndex = playersInTurnOrder.findIndex(
      (p) => p.id === view.playerId,
    );
    if (selfIndex === -1) return playersInTurnOrder;

    const self = playersInTurnOrder[selfIndex];
    const opponents: PublicPlayer[] = [];
    for (let i = 1; i < playersInTurnOrder.length; i++) {
      opponents.push(
        playersInTurnOrder[(selfIndex + i) % playersInTurnOrder.length],
      );
    }
    return [self, ...opponents];
  }, [playersInTurnOrder, view.playerId]);

  const playersInCarouselOrder = useMemo(() => {
    const selfIndex = playersInTurnOrder.findIndex(
      (p) => p.id === view.playerId,
    );
    if (selfIndex === -1) return playersInTurnOrder;

    const opponents: PublicPlayer[] = [];
    for (let i = 1; i < playersInTurnOrder.length; i++) {
      opponents.push(
        playersInTurnOrder[(selfIndex + i) % playersInTurnOrder.length],
      );
    }
    const self = playersInTurnOrder[selfIndex];
    const leftCount = Math.floor(opponents.length / 2);
    return [
      ...opponents.slice(0, leftCount),
      self,
      ...opponents.slice(leftCount),
    ];
  }, [playersInTurnOrder, view.playerId]);

  const orderedPlayers = !ownSeatProminent
    ? playersInTurnOrder
    : playerGridEnabled
      ? playersInGridOrder
      : playersInCarouselOrder;

  if (view.isWaiting) {
    return <WaitingScreen view={view} connected={connected} />;
  }

  if (view.phase === "ended") {
    return <GameOverScreen view={view} connected={connected} send={send} />;
  }

  const isLobbyScrollLayout = view.phase === "lobby";
  const me = view.players.find((p) => p.id === view.playerId);
  const isHost = me?.isHost ?? false;
  const cambioCallerName =
    view.players.find((p) => p.id === cambioFlash?.playerId)?.name ?? "";

  const phaseLabel = voice.phases[view.phase] ?? "";
  const snapWindowActive = view.phase === "snap_window";

  const isDrawnSlotMine = Boolean(view.drawnCard);
  const showDrawnFaceDown = !isDrawnSlotMine && view.hasDrawnCard;
  const canTakeFromDiscard =
    view.canDraw && Boolean(view.discardTop) && !snapGivePending;
  const canInteractWithDiscard =
    (canTakeFromDiscard || view.canDiscardDrawn) && !snapGivePending;
  const showDiscardPileGlow =
    canInteractWithDiscard || (isDrawnSlotMine && !snapGivePending);
  const drawnDiscardAbility =
    view.canDiscardDrawn && view.drawnCard
      ? abilityForDiscard(view.drawnCard)
      : null;
  const discardActionLabel = drawnDiscardAbility
    ? voice.discardAbilityButton[drawnDiscardAbility]
    : voice.discardDrawn;

  const handleCardClick = (playerId: string, slot: number, isOwn: boolean) => {
    if (view.phase === "setup_peek" && !isOwn) return;

    if (view.phase === "setup_peek" && isOwn) {
      if (!SETUP_PEEK_SLOTS.includes(slot)) return;
      if (view.ownSetupPeekedSlots.includes(slot)) return;
      hapticClick("light");
      send({ type: "setup_peek", slot });
      return;
    }

    const pending = view.pendingAbility;
    if (pending?.kind === "snap_give") {
      if (isOwn) {
        hapticClick("medium");
        send({ type: "snap_give", slot });
      }
      return;
    }
    if (view.snapGivePending) {
      return;
    }
    if (pending?.kind === "peek_own" && isOwn) {
      hapticClick("light");
      send({ type: "ability_look", playerId, slot });
      return;
    }
    if (pending?.kind === "spy" && !isOwn) {
      hapticClick("light");
      send({ type: "ability_look", playerId, slot });
      return;
    }
    if (pending?.kind === "queen_look" || pending?.kind === "king_look") {
      hapticClick("light");
      send({ type: "ability_look", playerId, slot });
      return;
    }
    if (isSwapAbility(pending?.kind)) {
      if (!selectedSwapCard) {
        hapticClick("selection");
        setSelectedSwapCard({ playerId, slot });
        return;
      }

      if (
        selectedSwapCard.playerId === playerId &&
        selectedSwapCard.slot === slot
      ) {
        hapticClick("selection");
        setSelectedSwapCard(null);
        return;
      }

      hapticClick("medium");
      send({
        type: "ability_swap",
        fromPlayerId: selectedSwapCard.playerId,
        fromSlot: selectedSwapCard.slot,
        toPlayerId: playerId,
        toSlot: slot,
      });
      setSelectedSwapCard(null);
      return;
    }

    if (view.canSwap && isOwn) {
      hapticClick("medium");
      send({ type: "swap", slot });
      return;
    }

    if (view.canSnap) {
      const isProtected =
        view.phase === "cambio_final" &&
        view.cambioCallerId === playerId &&
        playerId !== view.playerId;
      if (isProtected) return;
      void triggerSnapHaptic();
      send({ type: "snap", targetPlayerId: playerId, slot });
      return;
    }
  };

  const copyRoomCode = () => {
    hapticClick("selection");
    void copyToClipboard(view.roomId.toUpperCase()).then((copied) => {
      if (!copied) return;
      setRoomCopied(true);
      window.setTimeout(() => setRoomCopied(false), 2000);
    });
  };

  const shareRoom = () => {
    if (!nativeShareEnabled) return;
    hapticClick("selection");
    const roomCode = view.roomId.toUpperCase();
    const roomUrl =
      typeof window === "undefined"
        ? null
        : new URL(`/play/${view.roomId}`, window.location.origin).toString();
    if (!roomUrl) return;
    void shareRoomInvite({ roomCode, roomUrl }).then((shared) => {
      if (!shared) return;
      setRoomShared(true);
      window.setTimeout(() => setRoomShared(false), 2000);
    });
  };

  const playerSeats = orderedPlayers.map((player) => {
    const isOwn = player.id === view.playerId;
    return (
      <PlayerSeat
        key={player.id}
        player={player}
        viewerId={view.playerId}
        phase={view.phase}
        cambioCallerId={view.cambioCallerId}
        ownSetupPeekedSlots={isOwn ? view.ownSetupPeekedSlots : []}
        fleetingPeek={fleetingPeek}
        peekFlash={peekFlash}
        swapFlash={swapFlash}
        takeFlash={takeFlash}
        snapFlash={snapFlash}
        penaltyFlash={penaltyFlash}
        selectedSwapCard={selectedSwapCard}
        canSwap={isOwn ? view.canSwap : undefined}
        canSnap={view.canSnap}
        snapGiveActive={snapGiveActive}
        snapGivePending={snapGivePending}
        swapAbilityActive={swapAbilityActive}
        lookAbilityActive={lookAbilityActive}
        pendingLookKind={pendingLookKind}
        compact
        fitHandToWidth={playerGridEnabled}
        voice={voice}
        onCardClick={handleCardClick}
      />
    );
  });

  const actionButtons = (
    <div
      className="action-buttons-slot flex flex-wrap gap-2 sm:gap-3 justify-center lg:justify-start items-center"
      aria-live="polite"
    >
      {view.canStartGame && (
        <RetroButton onClick={() => send({ type: "start_game" })}>
          {voice.startGame}
        </RetroButton>
      )}

      {view.canShowResults && (
        <RetroButton onClick={() => send({ type: "show_results" })}>
          {voice.showResults}
        </RetroButton>
      )}
    </div>
  );

  const hasActionButtons = view.canStartGame || view.canShowResults;

  const callCambioChip = (
    <button
      type="button"
      data-tutorial={view.canCallCambio ? "call-cambio" : undefined}
      disabled={!view.canCallCambio}
      aria-hidden={!view.canCallCambio}
      tabIndex={view.canCallCambio ? undefined : -1}
      onClick={() => {
        if (!view.canCallCambio) return;
        void triggerCambioHaptic();
        send({ type: "call_cambio" });
      }}
      className={`table-cambio-chip chip-btn ${
        view.canCallCambio ? "" : "invisible pointer-events-none animate-none"
      }`}
    >
      {voice.callCambio}
    </button>
  );

  const canDebugRestart =
    debugEnabled &&
    isHost &&
    view.phase !== "lobby" &&
    view.players.filter((p) => !p.isWaiting).length >= 2;

  const gameSettingsButtons = (
    <>
      <button
        type="button"
        onClick={() => {
          hapticClick("selection");
          toggleSound();
        }}
        aria-label={soundEnabled ? voice.soundOn : voice.soundOff}
        title={soundEnabled ? voice.soundOn : voice.soundOff}
        className={CHROME_ICON_BTN}
      >
        {soundEnabled ? (
          <Volume2 aria-hidden className={CHROME_ICON_CLASS} />
        ) : (
          <VolumeX aria-hidden className={CHROME_ICON_CLASS} />
        )}
      </button>
      <button
        type="button"
        onClick={() => {
          hapticClick("selection");
          toggleHints();
        }}
        aria-label={hintsEnabled ? voice.hintsOn : voice.hintsOff}
        title={hintsEnabled ? voice.hintsOn : voice.hintsOff}
        className={CHROME_ICON_BTN}
      >
        {hintsEnabled ? (
          <Lightbulb aria-hidden className={CHROME_ICON_CLASS} />
        ) : (
          <LightbulbOff aria-hidden className={CHROME_ICON_CLASS} />
        )}
      </button>
      <button
        type="button"
        onClick={() => {
          hapticClick("selection");
          togglePlayerGrid();
        }}
        aria-label={
          playerGridEnabled ? voice.playerGridOn : voice.playerGridOff
        }
        title={playerGridEnabled ? voice.playerGridOn : voice.playerGridOff}
        className={CHROME_ICON_BTN}
      >
        {playerGridEnabled ? (
          <LayoutGrid aria-hidden className={CHROME_ICON_CLASS} />
        ) : (
          <GalleryHorizontal aria-hidden className={CHROME_ICON_CLASS} />
        )}
      </button>
      <button
        type="button"
        onClick={() => {
          hapticClick("selection");
          toggleOwnSeatDisplay();
        }}
        aria-label={
          ownSeatProminent ? voice.ownSeatProminent : voice.ownSeatTurnOrder
        }
        title={
          ownSeatProminent ? voice.ownSeatProminent : voice.ownSeatTurnOrder
        }
        className={CHROME_ICON_BTN}
      >
        {ownSeatProminent ? (
          <CircleUser aria-hidden className={CHROME_ICON_CLASS} />
        ) : (
          <ListOrdered aria-hidden className={CHROME_ICON_CLASS} />
        )}
      </button>
      <button
        type="button"
        onClick={() => {
          hapticClick("selection");
          toggleChatNotifications();
        }}
        aria-label={
          chatNotificationsEnabled ? voice.chatNotifsOn : voice.chatNotifsOff
        }
        title={
          chatNotificationsEnabled ? voice.chatNotifsOn : voice.chatNotifsOff
        }
        className={CHROME_ICON_BTN}
      >
        {chatNotificationsEnabled ? (
          <MessageSquare aria-hidden className={CHROME_ICON_CLASS} />
        ) : (
          <MessageSquareOff aria-hidden className={CHROME_ICON_CLASS} />
        )}
      </button>
      <button
        type="button"
        onClick={() => {
          hapticClick("selection");
          toggleEventNotifications();
        }}
        aria-label={
          eventNotificationsEnabled ? voice.eventNotifsOn : voice.eventNotifsOff
        }
        title={
          eventNotificationsEnabled ? voice.eventNotifsOn : voice.eventNotifsOff
        }
        className={CHROME_ICON_BTN}
      >
        {eventNotificationsEnabled ? (
          <Bell aria-hidden className={CHROME_ICON_CLASS} />
        ) : (
          <BellOff aria-hidden className={CHROME_ICON_CLASS} />
        )}
      </button>
    </>
  );

  const gameDebugButtons = canDebugRestart ? (
    <div className="flex flex-wrap gap-2 shrink-0">
      <button
        type="button"
        onClick={() => {
          hapticClick("selection");
          send({ type: "toggle_debug" });
        }}
        className="chip-btn text-[8px] px-2 py-1 border-theme-muted text-theme hover:border-accent transition-colors"
      >
        {view.debugReveal ? voice.debugHide : voice.debugReveal}
      </button>
      <button
        type="button"
        onClick={() => {
          hapticClick("warning");
          send({ type: "restart_game" });
        }}
        className="chip-btn text-[8px] px-2 py-1 border-theme-muted text-theme hover:border-accent transition-colors"
      >
        {voice.debugRestart}
      </button>
    </div>
  ) : null;

  const gameSidebarPanels = (
    <>
      <ChatPanel
        messages={view.chatMessages}
        playerId={view.playerId}
        connected={connected}
        voice={voice}
        onSend={(text) => send({ type: "chat", text })}
      />

      <div className="pixel-border p-3 bg-surface w-full min-w-0 flex flex-col overflow-hidden max-h-35 lg:max-h-none lg:flex-1 lg:min-h-0">
        <p className="font-display text-[8px] text-theme-muted mb-2 shrink-0">
          {voice.gameLog}
        </p>
        <div className="min-h-18 max-h-35 lg:max-h-none lg:flex-1 lg:min-h-0 overflow-y-auto overflow-x-hidden">
          {view.log.slice(-12).map((line, index) => {
            const logIndex = Math.max(0, view.log.length - 12) + index;
            return (
              <p
                key={`log-${logIndex}`}
                className="font-mono text-[10px] text-theme-muted leading-relaxed wrap-break-word"
              >
                {line}
              </p>
            );
          })}
        </div>
      </div>

      <div className="shrink-0">
        <ThemePicker compact />
      </div>
    </>
  );

  const gameSidebar = (
    <>
      <div className="flex flex-wrap gap-2 shrink-0">{gameSettingsButtons}</div>
      {gameDebugButtons}
      {gameSidebarPanels}
    </>
  );

  return (
    <div
      className={`w-full max-w-7xl mx-auto flex flex-col ${
        isLobbyScrollLayout ? "" : "h-full flex-1 min-h-0 overflow-hidden"
      } ${snapWindowActive ? "snap-window-active" : ""}`}
    >
      <GameToastLayer toasts={gameToasts} />
      <CambioCallOverlay
        cambioFlash={cambioFlash}
        callerName={cambioCallerName}
        isSelfCall={cambioFlash?.playerId === view.playerId}
        voice={voice}
      />
      <ReshuffleOverlay reshuffleFlash={reshuffleFlash} voice={voice} />
      <SnapWindowOverlay
        active={snapWindowActive}
        seconds={snapWindowSeconds}
        voice={voice}
      />
      <TutorialCoach
        key={coachHint ?? "idle"}
        hintId={coachHint}
        onSkip={markGameSeen}
        onComplete={() => {
          if (!coachHint) return;
          useTutorialStore.getState().dismissCoachHint(coachHint);
        }}
      />

      {settingsOpen && (
        <div className="lg:hidden fixed inset-0 z-90">
          <button
            type="button"
            className="absolute inset-0 bg-black/50"
            onClick={() => {
              hapticClick("selection");
              setSettingsOpen(false);
            }}
            aria-label="Close menu"
          />
          <div className="mobile-settings-sheet absolute inset-x-0 bottom-0 top-[max(0.75rem,env(safe-area-inset-top,0px))] flex flex-col bg-surface pixel-border border-b-0 overflow-hidden">
            <div className="shrink-0 flex items-center justify-between gap-3 px-4 py-3.5 min-h-15">
              <p className="font-display text-base sm:text-lg text-theme leading-tight">
                {voice.gameMenuLabel}
              </p>
              <button
                type="button"
                onClick={() => {
                  hapticClick("selection");
                  setSettingsOpen(false);
                }}
                className="sheet-close-btn border-theme-muted text-theme hover:border-accent hover:text-accent transition-colors"
                aria-label="Close menu"
              >
                <X aria-hidden className="size-5" />
              </button>
            </div>
            <div className="mobile-game-sheet overflow-y-auto flex-1 min-h-0 px-4 pt-0 pb-[max(1rem,env(safe-area-inset-bottom,0px))] flex flex-col gap-3">
              {gameSidebar}
            </div>
          </div>
        </div>
      )}

      <div
        className={`flex flex-col min-w-0 ${
          isLobbyScrollLayout
            ? "lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(260px,300px)] lg:grid-rows-[auto_auto_auto] lg:items-start lg:gap-3"
            : "flex-1 min-h-0 overflow-hidden lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(260px,300px)] lg:grid-rows-[auto_auto_minmax(0,1fr)] lg:gap-3"
        }`}
      >
        <div
          className={`scroll-stable flex flex-col min-w-0 gap-2 sm:gap-3 lg:contents ${
            isLobbyScrollLayout ? "" : "flex-1 min-h-0 overflow-hidden"
          }`}
        >
          <div className="shrink-0 lg:contents">
            <header className="flex items-center gap-2 min-w-0 lg:col-start-1 lg:row-start-1">
              <div className="min-w-0 flex-1 flex items-center gap-1.5 overflow-hidden">
                <p className="font-display text-[8px] sm:text-[9px] text-theme-muted truncate min-w-0">
                  {voice.roomPrefix}{" "}
                  <span className="text-theme">
                    {view.roomId.toUpperCase()}
                  </span>
                </p>
                <button
                  type="button"
                  onClick={copyRoomCode}
                  aria-live="polite"
                  aria-label={roomCopied ? voice.copied : voice.copy}
                  title={roomCopied ? voice.copied : voice.copy}
                  className={`${CHROME_ICON_BTN} shrink-0 ${
                    roomCopied ? "border-accent text-accent" : ""
                  }`}
                >
                  {roomCopied ? (
                    <Check aria-hidden className={CHROME_ICON_CLASS} />
                  ) : (
                    <Copy aria-hidden className={CHROME_ICON_CLASS} />
                  )}
                </button>
                {view.phase === "lobby" && nativeShareEnabled ? (
                  <button
                    type="button"
                    onClick={shareRoom}
                    aria-live="polite"
                    aria-label={roomShared ? "Shared invite" : "Share invite"}
                    title={roomShared ? "Shared invite" : "Share invite"}
                    className={`${CHROME_ICON_BTN} shrink-0 ${
                      roomShared ? "border-accent text-accent" : ""
                    }`}
                  >
                    {roomShared ? (
                      <Check aria-hidden className={CHROME_ICON_CLASS} />
                    ) : (
                      <Share2 aria-hidden className={CHROME_ICON_CLASS} />
                    )}
                  </button>
                ) : null}
                <span
                  role="status"
                  className={`inline-block h-1.5 w-1.5 shrink-0 rounded-full ${
                    connected
                      ? "bg-(--accent-alt) shadow-[0_0_6px_var(--glow-accent-alt)]"
                      : error
                        ? "bg-(--danger)"
                        : "bg-(--accent) opacity-75"
                  }`}
                  title={
                    connected
                      ? voice.online
                      : error
                        ? undefined
                        : voice.reconnecting
                  }
                />
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    hapticClick("selection");
                    openSettings();
                  }}
                  className={`${CHROME_ICON_BTN} relative lg:hidden`}
                  aria-label={
                    unreadCount > 0
                      ? `Game menu (${unreadCount} unread messages)`
                      : voice.gameMenuLabel
                  }
                  title={voice.gameMenuLabel}
                >
                  <MoreHorizontal aria-hidden className={CHROME_ICON_CLASS} />
                  {unreadCount > 0 ? (
                    <span className="absolute -top-1 -right-1 min-w-3.5 h-3.5 px-0.5 flex items-center justify-center rounded-full bg-accent text-[8px] font-display text-surface leading-none">
                      {unreadCount > 9 ? "9+" : unreadCount}
                    </span>
                  ) : null}
                </button>
                <Link
                  href="/"
                  className={CHROME_ICON_BTN}
                  aria-label={voice.leaveGame}
                  title={voice.leaveGame}
                >
                  <LogOut aria-hidden className={CHROME_ICON_CLASS} />
                </Link>
              </div>
            </header>

            <div className="lg:col-start-1 lg:row-start-2">
              <h1 className="font-display text-[11px] sm:text-sm title-glow truncate mt-1 lg:mt-0 tracking-(--display-tracking) leading-snug">
                {phaseLabel}
              </h1>

              {debugEnabled && view.debugReveal && (
                <p className="font-display text-[8px] text-accent-alt mt-0.5">
                  DEBUG: ALL CARDS VISIBLE
                </p>
              )}
            </div>
          </div>

          <div
            className={`flex flex-col min-w-0 gap-2 sm:gap-3 lg:col-start-1 lg:row-start-3 lg:min-h-0 ${
              isLobbyScrollLayout ? "" : "flex-1 min-h-0 overflow-hidden"
            }`}
          >
            {view.phase !== "lobby" && (
              <div
                ref={tableDeckRef}
                className={`table-deck pixel-border bg-surface flex flex-col min-h-0 ${
                  playerGridEnabled
                    ? "table-deck-compact shrink-0"
                    : "px-2 py-2 sm:px-3 sm:py-2.5 lg:px-4 lg:py-3 gap-2 sm:gap-2.5 flex-1 max-h-[min(42vh,22rem)]"
                } ${
                  view.canDrawFromDeck && !snapGivePending
                    ? "table-deck-drawable ring-2 ring-accent-alt"
                    : ""
                } ${snapWindowActive ? "snap-window-deck ring-4 ring-danger/70" : ""}`}
              >
                {hintsEnabled ? (
                  <div
                    data-table-hint
                    className="table-hint table-hint-slot shrink-0 mx-auto w-full flex items-center justify-center"
                  >
                    <AnimatePresence initial={false} mode="wait">
                      {actionToast ? (
                        <GameToast
                          key={actionToast.id}
                          toast={actionToast}
                          inline
                          className="p-2! text-[9px]! sm:text-[10px]! leading-[1.45]! shadow-none"
                        />
                      ) : null}
                    </AnimatePresence>
                  </div>
                ) : null}

                <div
                  className={`flex flex-col items-center ${
                    playerGridEnabled
                      ? "shrink-0 gap-1"
                      : "flex-1 min-h-0 justify-center gap-2"
                  }`}
                >
                  <div
                    className={`grid w-full grid-cols-3 items-end justify-items-center ${
                      playerGridEnabled
                        ? "gap-x-1.5 sm:gap-x-2 px-0.5"
                        : "gap-x-2 sm:gap-x-4 lg:gap-x-6 px-1 sm:px-2"
                    }`}
                  >
                    <button
                      type="button"
                      data-tutorial="deck"
                      disabled={!view.canDrawFromDeck || snapGivePending}
                      onClick={() => {
                        hapticClick("light");
                        send({ type: "draw", source: "deck" });
                      }}
                      className={`table-pile flex flex-col items-center gap-0.5 lg:gap-1 border-0 bg-transparent p-0 disabled:cursor-default ${
                        view.canDrawFromDeck && !snapGivePending
                          ? "pile-interactable-btn cursor-pointer active:opacity-80"
                          : ""
                      }`}
                      aria-label={voice.draw}
                    >
                      <p
                        className={`table-pile-label ${
                          deckDrawFlash
                            ? "pile-draw-flash-label"
                            : view.canDrawFromDeck && !snapGivePending
                              ? "pile-interactable-label"
                              : "text-theme-muted"
                        }`}
                      >
                        {voice.deck}
                      </p>
                      <div
                        className={`table-pile-card pixel-border rounded-card scaled-pile-size bg-surface-card flex items-center justify-center font-display text-on-card shrink-0 ${
                          deckDrawFlash
                            ? "pile-draw-flash pile-draw-flash-deck"
                            : view.canDrawFromDeck && !snapGivePending
                              ? "pile-interactable-card ring-2 ring-accent-alt"
                              : ""
                        }`}
                      >
                        {deckDrawFlash && (
                          <span className="pile-draw-flash-badge pile-draw-flash-badge-deck">
                            DRAWN
                          </span>
                        )}
                        <span className="relative z-10">{view.deckCount}</span>
                      </div>
                    </button>

                    <div
                      className={`drawn-card-slot flex flex-col items-center ${
                        isDrawnSlotMine || view.hasDrawnCard
                          ? "drawn-card-slot-active"
                          : ""
                      } ${view.canSwap && !snapGivePending ? "drawn-card-slot-actionable" : ""}`}
                    >
                      <AnimatePresence mode="wait">
                        <motion.div
                          key={
                            isDrawnSlotMine
                              ? "mine"
                              : view.hasDrawnCard
                                ? "other"
                                : "empty"
                          }
                          className={`flex flex-col items-center ${
                            playerGridEnabled ? "gap-0.5" : "gap-1"
                          }`}
                          initial={{ opacity: 0, scale: 0.9 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.9 }}
                          transition={{ duration: 0.2, ease: "easeOut" }}
                        >
                          <p
                            className={`drawn-card-label font-display ${
                              playerGridEnabled
                                ? "text-[8px] sm:text-[9px]"
                                : "text-[10px] sm:text-xs lg:text-sm"
                            } ${
                              isDrawnSlotMine
                                ? "text-accent"
                                : view.hasDrawnCard
                                  ? "text-accent-alt"
                                  : "text-theme-muted"
                            }`}
                          >
                            {voice.drawn}
                          </p>
                          <div
                            className={`drawn-card-container ${
                              view.canSwap && !snapGivePending
                                ? "ring-2 ring-accent shadow-glow-accent rounded-card drawn-card-glow"
                                : isDrawnSlotMine
                                  ? "ring-2 ring-accent/50 rounded-card"
                                  : view.hasDrawnCard
                                    ? "ring-1 ring-accent-alt/40 rounded-card"
                                    : ""
                            }`}
                          >
                            <PixelCard
                              card={view.drawnCard}
                              faceUp={isDrawnSlotMine}
                              hidden={showDrawnFaceDown}
                              empty={!isDrawnSlotMine && !view.hasDrawnCard}
                              sizeClass="drawn-card-size"
                            />
                          </div>
                        </motion.div>
                      </AnimatePresence>
                    </div>

                    <button
                      type="button"
                      data-tutorial="discard"
                      disabled={!canInteractWithDiscard}
                      onClick={() => {
                        if (view.canDiscardDrawn) {
                          hapticClick("light");
                          send({ type: "discard_drawn" });
                          return;
                        }
                        if (canTakeFromDiscard) {
                          hapticClick("light");
                          send({ type: "draw", source: "discard" });
                        }
                      }}
                      className={`table-pile flex flex-col items-center gap-0.5 lg:gap-1 border-0 bg-transparent p-0 disabled:cursor-default ${
                        canInteractWithDiscard
                          ? "pile-interactable-btn cursor-pointer active:opacity-80"
                          : ""
                      }`}
                      aria-label={
                        view.canDiscardDrawn ? discardActionLabel : voice.take
                      }
                    >
                      <p
                        className={`table-pile-label ${
                          discardDrawFlash
                            ? "pile-draw-flash-label pile-draw-flash-label-discard"
                            : showDiscardPileGlow
                              ? "pile-interactable-label pile-interactable-label-discard"
                              : "text-theme-muted"
                        }`}
                      >
                        {voice.discard}
                      </p>
                      <div
                        className={`scaled-pile-size shrink-0 relative ${
                          discardDrawFlash
                            ? "pile-draw-flash pile-draw-flash-discard rounded-card"
                            : showDiscardPileGlow
                              ? "pile-interactable-card pile-interactable-discard ring-2 ring-accent rounded-card"
                              : snapWindowActive
                                ? "ring-4 ring-danger rounded-card snap-window-discard"
                                : view.canSnap
                                  ? "ring-1 ring-danger/50 rounded-card"
                                  : ""
                        }`}
                      >
                        {discardDrawFlash && (
                          <span className="pile-draw-flash-badge pile-draw-flash-badge-discard">
                            TOOK
                          </span>
                        )}
                        <AnimatePresence mode="wait">
                          <motion.div
                            key={view.discardTop?.id ?? "empty-discard"}
                            className="h-full w-full"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.18, ease: "easeOut" }}
                          >
                            <PixelCard
                              card={view.discardTop}
                              faceUp={!!view.discardTop}
                              hidden={!view.discardTop}
                              empty={!view.discardTop}
                              sizeClass="scaled-pile-size"
                            />
                          </motion.div>
                        </AnimatePresence>
                      </div>
                    </button>
                  </div>

                  {playerGridEnabled ? (
                    <div className="table-grid-context shrink-0 w-full min-w-0">
                      {showDrawnActionChrome && view.canDiscardDrawn ? (
                        <button
                          type="button"
                          onClick={() => {
                            hapticClick("light");
                            send({ type: "discard_drawn" });
                          }}
                          className="table-grid-context-action w-full truncate"
                        >
                          {discardActionLabel}
                        </button>
                      ) : showDrawnActionChrome && view.canSwap ? (
                        <p className="table-grid-context-hint truncate">
                          {voice.tapToSwap}
                        </p>
                      ) : (
                        callCambioChip
                      )}
                    </div>
                  ) : null}

                  {!playerGridEnabled ? (
                    <div
                      data-table-chrome
                      className="table-action-chrome table-chrome-slot flex items-center justify-center shrink-0"
                    >
                      {showDrawnActionChrome ? (
                        <div className="table-action-chrome-row">
                          {view.canSwap ? (
                            <span className="chip-btn text-[8px] px-2 py-1 border-accent text-accent animate-pulse pointer-events-none">
                              {voice.tapToSwap}
                            </span>
                          ) : null}
                          {view.canDiscardDrawn ? (
                            <button
                              type="button"
                              onClick={() => {
                                hapticClick("light");
                                send({ type: "discard_drawn" });
                              }}
                              className="chip-btn text-[8px] px-2 py-1 border-accent-alt text-accent-alt hover:border-accent transition-colors"
                            >
                              {discardActionLabel}
                            </button>
                          ) : null}
                        </div>
                      ) : (
                        callCambioChip
                      )}
                    </div>
                  ) : null}
                </div>

                {!playerGridEnabled ? (
                  <div
                    data-table-event
                    className="table-event-strip table-event-slot shrink-0 w-full min-w-0"
                    aria-live="polite"
                  >
                    <AnimatePresence initial={false} mode="wait">
                      {view.log.length > 0 ? (
                        <motion.p
                          key={`${view.log.length}-${view.log.at(-1)}`}
                          className="font-mono text-[9px] sm:text-[10px] text-theme-muted text-center truncate px-1"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          transition={{ duration: 0.18 }}
                        >
                          {view.log.at(-1)}
                        </motion.p>
                      ) : (
                        <p
                          key="empty-event"
                          className="font-mono text-[9px] sm:text-[10px] text-transparent text-center truncate px-1 select-none"
                          aria-hidden
                        >
                          —
                        </p>
                      )}
                    </AnimatePresence>
                  </div>
                ) : null}
              </div>
            )}

            {view.phase === "lobby" ? (
              <LobbyPlayers view={view} voice={voice} send={send} />
            ) : (
              <div className="players-with-action-overlay relative flex flex-1 flex-col gap-1.5 sm:gap-2 min-h-0 min-w-0 overflow-hidden">
                <p className="shrink-0 font-display text-[8px] text-theme-muted text-center tracking-widest">
                  PLAYERS
                </p>

                {orderedPlayers.length > 0 ? (
                  playerGridEnabled ? (
                    <PlayerGridStage>{playerSeats}</PlayerGridStage>
                  ) : (
                    <PlayerScrollStage
                      centerIndex={Math.max(
                        0,
                        orderedPlayers.findIndex(
                          (player) => player.id === view.playerId,
                        ),
                      )}
                    >
                      {playerSeats}
                    </PlayerScrollStage>
                  )
                ) : null}

                {hasActionButtons ? (
                  <div className="players-action-bar shrink-0 lg:hidden">
                    {actionButtons}
                  </div>
                ) : null}
              </div>
            )}

            {view.phase === "lobby" ? (
              <div className="shrink-0 lg:hidden mt-auto pt-4 sm:pt-5">
                {actionButtons}
              </div>
            ) : null}
          </div>
        </div>

        <div className="hidden lg:flex items-center justify-start gap-1.5 min-w-0 w-full lg:col-start-2 lg:row-start-1">
          {gameSettingsButtons}
        </div>

        {(hasActionButtons || gameDebugButtons) && (
          <div className="hidden lg:flex flex-wrap items-center gap-2 min-w-0 lg:col-start-2 lg:row-start-2">
            {hasActionButtons ? (
              <div className="shrink-0">{actionButtons}</div>
            ) : null}
            {gameDebugButtons}
          </div>
        )}

        <aside
          className={`hidden lg:flex flex-col gap-3 min-w-0 lg:col-start-2 lg:row-start-3 ${
            isLobbyScrollLayout
              ? "lg:sticky lg:top-3 lg:self-start"
              : "h-full min-h-0 self-stretch"
          }`}
        >
          {gameSidebarPanels}
        </aside>
      </div>
    </div>
  );
}
