"use client";

import { AnimatePresence, motion } from "framer-motion";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  HAND_GRID_WIDTH,
  PILE_CARD_SIZE,
  PixelCard,
} from "@/components/cards/PixelCard";
import { CambioCallOverlay } from "@/components/game/CambioCallOverlay";
import { GameOverScreen } from "@/components/game/GameOverScreen";
import { LobbyPlayers } from "@/components/game/LobbyPlayers";
import { PlayerScrollStage } from "@/components/game/PlayerScrollStage";
import { WaitingScreen } from "@/components/game/WaitingScreen";
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
import type {
  CambioFlash,
  FleetingPeek,
  PeekFlash,
  PenaltyFlash,
  SwapFlash,
} from "@/hooks/useGameConnection";
import { useGameSounds } from "@/hooks/useGameSounds";
import { useHintsEnabled } from "@/hooks/useHintsEnabled";
import { useSoundEnabled } from "@/hooks/useSoundEnabled";
import { useThemeVoice } from "@/hooks/useThemeVoice";
import { copyToClipboard } from "@/lib/clipboard";
import type { ThemeVoice } from "@/lib/themes";

type GameTableProps = {
  view: PlayerView;
  connected: boolean;
  error: string | null;
  fleetingPeek: FleetingPeek | null;
  peekFlash: PeekFlash | null;
  swapFlash: SwapFlash | null;
  penaltyFlash: PenaltyFlash | null;
  cambioFlash: CambioFlash | null;
  send: (message: ClientMessage) => void;
};

type SelectedCard = { playerId: string; slot: number };

const LOBBY_JOIN_TOAST_MS = 3000;

function formatPeekFlashNotice(
  peekFlash: PeekFlash,
  players: PlayerView["players"],
  fallback: string,
): string {
  const actor = players.find((entry) => entry.id === peekFlash.actorId);
  const target = players.find((entry) => entry.id === peekFlash.playerId);
  const actorName = actor?.name ?? "Player";
  const targetName = target?.name ?? "Player";
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

function penaltyGridColumns(count: number): number {
  if (count <= 0) return 0;
  if (count <= 2) return 1;
  return Math.ceil(count / 2);
}

function penaltyGridPosition(penaltyIndex: number): {
  gridRow: number;
  gridColumn: number;
} {
  return {
    gridRow: (penaltyIndex % 2) + 1,
    gridColumn: Math.floor(penaltyIndex / 2) + 1,
  };
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
  if (view.canSnap && view.canDraw) {
    return { text: voice.snapHint, tone: "snap" };
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
    return { text: voice.drawHint, tone: "turn" };
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
  fleetingPeek,
  peekFlash,
  swapFlash,
  penaltyFlash,
  selectedSwapCard,
  canSwap,
  canSnap,
  snapGiveActive,
  swapAbilityActive,
  lookAbilityActive,
  pendingLookKind,
  compact = false,
  voice,
  onCardClick,
}: {
  player: PublicPlayer;
  viewerId: string;
  phase: PlayerView["phase"];
  cambioCallerId: string | null;
  fleetingPeek: FleetingPeek | null;
  peekFlash: PeekFlash | null;
  swapFlash: SwapFlash | null;
  penaltyFlash: PenaltyFlash | null;
  selectedSwapCard: SelectedCard | null;
  canSwap?: boolean;
  canSnap?: boolean;
  snapGiveActive?: boolean;
  swapAbilityActive?: boolean;
  lookAbilityActive?: boolean;
  pendingLookKind?: PendingAbility["kind"] | null;
  compact?: boolean;
  voice: ThemeVoice;
  onCardClick: (playerId: string, slot: number, isOwn: boolean) => void;
}) {
  const isOwn = player.id === viewerId;
  const showDrawnSwapHint = isOwn && canSwap;
  const showSnapGiveHint = isOwn && snapGiveActive;
  const showSetupPeekHint = phase === "setup_peek" && isOwn;
  const isProtectedTarget =
    phase === "cambio_final" &&
    cambioCallerId === player.id &&
    player.id !== viewerId;
  const canPickForAbility = swapAbilityActive && (!isProtectedTarget || isOwn);
  const showAbilitySwapHint = swapAbilityActive && canPickForAbility;
  const showSnapTarget =
    canSnap && !snapGiveActive && (!isProtectedTarget || isOwn);
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

  const renderHandSlot = (slot: PublicCardSlot, index: number) => {
    const isEmpty = !!slot.empty;
    const isFleetingPeek =
      fleetingPeek?.playerId === player.id && fleetingPeek.slot === index;
    const setupLocked =
      phase === "setup_peek" &&
      (!isOwn || !SETUP_PEEK_SLOTS.includes(index) || isEmpty);
    const abilityLocked = swapAbilityActive && !canPickForAbility;
    const lookLocked = lookAbilityActive && !canPickForLook(index);
    const isSelectedForSwap =
      selectedSwapCard?.playerId === player.id &&
      selectedSwapCard.slot === index;
    const canInteract =
      !isEmpty ||
      (showDrawnSwapHint && isOwn) ||
      (showAbilitySwapHint && !abilityLocked);

    const isPeekFlashOnSlot = isPeekFlashing(peekFlash, player.id, index);
    const showPeekFlashOverlay = isPeekFlashOnSlot && !isFleetingPeek;
    const showPenalty =
      penaltyFlash?.playerId === player.id && penaltyFlash.slot === index;

    return (
      <PixelCard
        key={`hand-${index}`}
        card={isFleetingPeek ? fleetingPeek.card : slot.card}
        empty={isEmpty && !isFleetingPeek}
        hidden={!isFleetingPeek && slot.hidden}
        faceUp={isFleetingPeek || slot.faceUp}
        revealing={isFleetingPeek}
        small={compact}
        swapFirstSelected={isSelectedForSwap && swapAbilityActive}
        swapFlashing={isSwapFlashing(swapFlash, player.id, index)}
        swapFlashSlotLabel={
          isSwapFlashing(swapFlash, player.id, index)
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
          !snapGiveActive
        }
        penaltyFlashing={showPenalty}
        penaltyFlashSlotLabel={showPenalty ? `#${index + 1}` : undefined}
        onClick={
          setupLocked || abilityLocked || lookLocked || !canInteract
            ? undefined
            : () => onCardClick(player.id, index, isOwn)
        }
        disabled={setupLocked || abilityLocked || lookLocked || !canInteract}
      />
    );
  };

  return (
    <section
      className={`pixel-border ${seatPadding} w-fit max-w-full shrink-0 ${
        hasSwapFlash
          ? "swap-seat-flash bg-swap-seat-flash ring-2 ring-accent shadow-glow-accent"
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
      <div className={`${HAND_GRID_WIDTH} mb-1 sm:mb-1.5 space-y-1`}>
        <h2 className="player-name text-[10px] sm:text-xs truncate text-center">
          {player.name}
          {isOwn ? " (you)" : ""}
        </h2>
        <div className="flex flex-wrap items-center justify-center gap-1">
          {hasSwapFlash && (
            <span className="ui-badge text-accent animate-pulse">SWAPPED</span>
          )}
          {hasPeekFlash && peekFlash && (
            <span className="ui-badge text-accent-alt animate-pulse">
              {peekFlashSeatLabel(peekFlash.kind)}
            </span>
          )}
          {hasPenaltyFlash && (
            <span className="ui-badge text-accent animate-pulse">PENALTY</span>
          )}
          {player.isHost && (
            <span className="ui-badge text-accent">{voice.host}</span>
          )}
          {player.isCurrentTurn && (
            <span className="ui-badge text-accent-alt animate-pulse">
              {voice.turn}
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
        <p
          className={`font-display text-[10px] sm:text-xs text-theme-muted text-center py-2 ${HAND_GRID_WIDTH}`}
        >
          {voice.waitingBadge}
        </p>
      ) : (
        <div className="flex flex-row items-end gap-1 lg:gap-1.5 w-fit max-w-full">
          <div
            className={`grid grid-cols-2 gap-1 lg:gap-1.5 ${HAND_GRID_WIDTH} shrink-0`}
          >
            {baseGridSlots.map(({ slot, index }) =>
              renderHandSlot(slot, index),
            )}
          </div>
          {penaltySlots.length > 0 && (
            <div
              className="grid grid-rows-2 grid-flow-col gap-1 lg:gap-1.5 shrink-0"
              style={{
                gridTemplateColumns: `repeat(${penaltyGridColumns(penaltySlots.length)}, auto)`,
              }}
            >
              {penaltySlots.map(({ slot, index }, penaltyIndex) => (
                <div
                  key={`penalty-wrap-${index}`}
                  style={penaltyGridPosition(penaltyIndex)}
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
  penaltyFlash,
  cambioFlash,
  send,
}: GameTableProps) {
  const voice = useThemeVoice();
  const { soundEnabled, toggleSound } = useSoundEnabled();
  const { hintsEnabled, toggleHints } = useHintsEnabled();
  useGameSounds(view, error, fleetingPeek, peekFlash, swapFlash, cambioFlash);
  const [selectedSwapCard, setSelectedSwapCard] = useState<SelectedCard | null>(
    null,
  );
  const [roomCopied, setRoomCopied] = useState(false);
  const [snapWindowSeconds, setSnapWindowSeconds] = useState<number | null>(
    null,
  );
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [lobbyJoinToast, setLobbyJoinToast] = useState<GameToastItem | null>(
    null,
  );
  const lobbyPlayersRef = useRef<Set<string>>(new Set());
  const lobbyJoinTimerRef = useRef<number | null>(null);

  const swapAbilityActive = isSwapAbility(view.pendingAbility?.kind);
  const snapGiveActive = view.pendingAbility?.kind === "snap_give";
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

  const gameToasts = useMemo((): GameToastItem[] => {
    const items: GameToastItem[] = [];

    if (error) {
      items.push({ id: "error", message: error, tone: "error" });
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

    return items;
  }, [error, peekFlash, penaltyFlash, swapFlash, view.players, voice]);

  const actionToast: GameToastItem | null =
    hintsEnabled && actionBanner
      ? {
          id: "action",
          message: actionBanner.text,
          tone: actionBanner.tone,
          pulse: swapAbilityActive && !!selectedSwapCard,
          action:
            swapAbilityActive && selectedSwapCard ? (
              <button
                type="button"
                onClick={() => setSelectedSwapCard(null)}
                className="chip-btn text-[8px] px-2 py-1 border-accent-alt text-accent-alt hover:border-accent transition-colors"
              >
                {voice.swapAbilityCancel}
              </button>
            ) : undefined,
        }
      : null;

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

  const playersInDisplayOrder = useMemo(() => {
    const activePlayers = view.players.filter((player) => !player.isWaiting);
    const selfIndex = activePlayers.findIndex((p) => p.id === view.playerId);
    if (selfIndex === -1) return activePlayers;

    const opponents: PublicPlayer[] = [];
    for (let i = 1; i < activePlayers.length; i++) {
      opponents.push(activePlayers[(selfIndex + i) % activePlayers.length]);
    }
    const self = activePlayers[selfIndex];
    const leftCount = Math.floor(opponents.length / 2);
    return [
      ...opponents.slice(0, leftCount),
      self,
      ...opponents.slice(leftCount),
    ];
  }, [view.players, view.playerId]);

  if (view.isWaiting) {
    return <WaitingScreen view={view} connected={connected} />;
  }

  if (view.phase === "ended") {
    return <GameOverScreen view={view} connected={connected} send={send} />;
  }

  const me = view.players.find((p) => p.id === view.playerId);
  const isHost = me?.isHost ?? false;
  const cambioCallerName =
    view.players.find((p) => p.id === cambioFlash?.playerId)?.name ?? "Player";

  const phaseLabel = voice.phases[view.phase] ?? "";

  const isDrawnSlotMine = Boolean(view.drawnCard);
  const showDrawnFaceDown = !isDrawnSlotMine && view.hasDrawnCard;
  const canTakeFromDiscard = view.canDraw && Boolean(view.discardTop);
  const canInteractWithDiscard = canTakeFromDiscard || view.canDiscardDrawn;
  const showDiscardPileGlow = canInteractWithDiscard || isDrawnSlotMine;

  const handleCardClick = (playerId: string, slot: number, isOwn: boolean) => {
    if (view.phase === "setup_peek" && !isOwn) return;

    if (view.phase === "setup_peek" && isOwn) {
      if (!SETUP_PEEK_SLOTS.includes(slot)) return;
      send({ type: "setup_peek", slot });
      return;
    }

    const pending = view.pendingAbility;
    if (pending?.kind === "peek_own" && isOwn) {
      send({ type: "ability_look", playerId, slot });
      return;
    }
    if (pending?.kind === "spy" && !isOwn) {
      send({ type: "ability_look", playerId, slot });
      return;
    }
    if (pending?.kind === "queen_look" || pending?.kind === "king_look") {
      send({ type: "ability_look", playerId, slot });
      return;
    }
    if (pending?.kind === "snap_give" && isOwn) {
      send({ type: "snap_give", slot });
      return;
    }
    if (isSwapAbility(pending?.kind)) {
      if (!selectedSwapCard) {
        setSelectedSwapCard({ playerId, slot });
        return;
      }

      if (
        selectedSwapCard.playerId === playerId &&
        selectedSwapCard.slot === slot
      ) {
        setSelectedSwapCard(null);
        return;
      }

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
      send({ type: "swap", slot });
      return;
    }

    if (view.canSnap) {
      const isProtected =
        view.phase === "cambio_final" &&
        view.cambioCallerId === playerId &&
        playerId !== view.playerId;
      if (isProtected) return;
      send({ type: "snap", targetPlayerId: playerId, slot });
      return;
    }
  };

  const copyRoomCode = () => {
    void copyToClipboard(view.roomId.toUpperCase()).then((copied) => {
      if (!copied) return;
      setRoomCopied(true);
      window.setTimeout(() => setRoomCopied(false), 2000);
    });
  };

  const actionButtons = (
    <div className="flex flex-wrap gap-2 sm:gap-3 justify-center lg:justify-start">
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

      {view.canCallCambio && (
        <RetroButton
          variant="danger"
          onClick={() => send({ type: "call_cambio" })}
        >
          {voice.callCambio}
        </RetroButton>
      )}
    </div>
  );

  const canDebugRestart =
    isHost &&
    view.phase !== "lobby" &&
    view.players.filter((p) => !p.isWaiting).length >= 2;

  const gameSidebar = (
    <>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={toggleSound}
          className="chip-btn text-[8px] px-2 py-1 border-theme-muted text-theme hover:border-accent transition-colors"
        >
          {soundEnabled ? voice.soundOn : voice.soundOff}
        </button>
        <button
          type="button"
          onClick={toggleHints}
          className="chip-btn text-[8px] px-2 py-1 border-theme-muted text-theme hover:border-accent transition-colors"
        >
          {hintsEnabled ? voice.hintsOn : voice.hintsOff}
        </button>
      </div>

      {canDebugRestart && (
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => send({ type: "toggle_debug" })}
            className="chip-btn text-[8px] px-2 py-1 border-theme-muted text-theme hover:border-accent transition-colors"
          >
            {view.debugReveal ? voice.debugHide : voice.debugReveal}
          </button>
          <button
            type="button"
            onClick={() => send({ type: "restart_game" })}
            className="chip-btn text-[8px] px-2 py-1 border-theme-muted text-theme hover:border-accent transition-colors"
          >
            {voice.debugRestart}
          </button>
        </div>
      )}

      <ThemePicker compact />

      <div className="pixel-border p-3 min-h-[120px] lg:min-h-[200px] lg:max-h-[50vh] lg:overflow-y-auto bg-surface">
        <p className="font-display text-[8px] text-theme-muted mb-2">
          {voice.gameLog}
        </p>
        {view.log.slice(-12).map((line, index) => {
          const logIndex = Math.max(0, view.log.length - 12) + index;
          return (
            <p
              key={`log-${logIndex}`}
              className="font-mono text-[10px] text-theme-muted leading-relaxed"
            >
              {line}
            </p>
          );
        })}
      </div>
    </>
  );

  return (
    <div className="w-full max-w-7xl mx-auto flex flex-col flex-1 min-h-0 h-full">
      <GameToastLayer toasts={gameToasts} />
      <CambioCallOverlay
        cambioFlash={cambioFlash}
        callerName={cambioCallerName}
        voice={voice}
      />

      {settingsOpen && (
        <div className="lg:hidden fixed inset-0 z-[90]">
          <button
            type="button"
            className="absolute inset-0 bg-black/50"
            onClick={() => setSettingsOpen(false)}
            aria-label="Close menu"
          />
          <div className="absolute inset-x-0 bottom-0 max-h-[85dvh] overflow-y-auto bg-surface pixel-border border-b-0 p-4 pb-[max(1rem,env(safe-area-inset-bottom,0px))] flex flex-col gap-4">
            <div className="flex items-center justify-between gap-3">
              <p className="font-display text-xs text-theme">
                {voice.styleLabel}
              </p>
              <button
                type="button"
                onClick={() => setSettingsOpen(false)}
                className="chip-btn chip-btn-sm border-theme-muted text-theme hover:border-accent transition-colors"
                aria-label="Close menu"
              >
                ✕
              </button>
            </div>
            {gameSidebar}
          </div>
        </div>
      )}

      <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(260px,300px)] lg:gap-6 lg:items-stretch flex flex-col flex-1 min-h-0 min-w-0">
        <div className="scroll-stable flex flex-col flex-1 min-h-0 min-w-0 gap-3 sm:gap-4 lg:gap-5">
          <header className="shrink-0 flex flex-col gap-2">
            <div className="flex flex-wrap items-center justify-between gap-2 sm:gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-display text-theme-muted text-[10px] sm:text-xs truncate">
                    {voice.roomPrefix} {view.roomId.toUpperCase()}
                  </p>
                  <button
                    type="button"
                    onClick={copyRoomCode}
                    aria-live="polite"
                    aria-label={roomCopied ? voice.copied : voice.copy}
                    className={`chip-btn chip-btn-sm transition-colors ${
                      roomCopied
                        ? "border-accent text-accent"
                        : "border-theme-muted text-theme hover:border-accent"
                    }`}
                  >
                    {voice.copy}
                  </button>
                </div>
                <h1 className="font-display text-sm sm:text-xl lg:text-2xl title-glow mt-0.5 sm:mt-1 truncate">
                  {phaseLabel}
                </h1>
                {view.debugReveal && (
                  <p className="font-display text-[8px] text-accent-alt mt-1">
                    DEBUG: ALL CARDS VISIBLE
                  </p>
                )}
              </div>
              <div className="flex items-center gap-2 sm:gap-3 shrink-0">
                <button
                  type="button"
                  onClick={() => setSettingsOpen(true)}
                  className="chip-btn chip-btn-sm border-theme-muted text-theme hover:border-accent transition-colors lg:hidden"
                  aria-label="Game menu"
                >
                  ···
                </button>
                <Link
                  href="/"
                  className="chip-btn chip-btn-sm border-theme-muted text-theme hover:border-accent transition-colors"
                >
                  {voice.leaveGame}
                </Link>
                <div className="font-display text-[10px] text-theme-muted hidden sm:block">
                  {connected ? voice.online : voice.reconnecting}
                </div>
              </div>
            </div>
            <div
              className={`relative shrink-0 ${
                (hintsEnabled && actionToast) ||
                (view.phase === "lobby" && lobbyJoinToast)
                  ? "h-14"
                  : "h-0"
              }`}
              aria-live="polite"
            >
              <AnimatePresence initial={false}>
                {hintsEnabled && actionToast ? (
                  <GameToast
                    key="action"
                    toast={actionToast}
                    inline
                    className="absolute inset-x-0 top-0"
                  />
                ) : null}
                {view.phase === "lobby" && lobbyJoinToast ? (
                  <GameToast
                    key={lobbyJoinToast.id}
                    toast={lobbyJoinToast}
                    inline
                    className="absolute inset-x-0 top-0"
                  />
                ) : null}
              </AnimatePresence>
            </div>
          </header>

          {view.phase !== "lobby" && (
            <div
              className={`table-deck shrink-0 pixel-border bg-surface px-2 py-1.5 lg:p-4 ${
                view.canDraw ? "table-deck-drawable ring-2 ring-accent-alt" : ""
              }`}
            >
              <div className="flex items-end justify-center gap-1.5 sm:gap-4 lg:gap-8">
                <button
                  type="button"
                  disabled={!view.canDraw}
                  onClick={() => send({ type: "draw", source: "deck" })}
                  className={`table-pile flex flex-col items-center gap-0.5 lg:gap-1 border-0 bg-transparent p-0 disabled:cursor-default ${
                    view.canDraw
                      ? "pile-interactable-btn cursor-pointer active:opacity-80"
                      : ""
                  }`}
                  aria-label={voice.draw}
                >
                  <p
                    className={`table-pile-label ${
                      view.canDraw
                        ? "pile-interactable-label"
                        : "text-theme-muted"
                    }`}
                  >
                    {voice.deck}
                  </p>
                  <div
                    className={`table-pile-card pixel-border rounded-card ${PILE_CARD_SIZE} bg-surface-card flex items-center justify-center font-display text-on-card shrink-0 ${
                      view.canDraw
                        ? "pile-interactable-card ring-2 ring-accent-alt"
                        : ""
                    }`}
                  >
                    {view.deckCount}
                  </div>
                </button>

                <button
                  type="button"
                  disabled={!canInteractWithDiscard}
                  onClick={() => {
                    if (view.canDiscardDrawn) {
                      send({ type: "discard_drawn" });
                      return;
                    }
                    if (canTakeFromDiscard) {
                      send({ type: "draw", source: "discard" });
                    }
                  }}
                  className={`table-pile flex flex-col items-center gap-0.5 lg:gap-1 border-0 bg-transparent p-0 disabled:cursor-default ${
                    canInteractWithDiscard
                      ? "pile-interactable-btn cursor-pointer active:opacity-80"
                      : ""
                  }`}
                  aria-label={
                    view.canDiscardDrawn ? voice.discardDrawn : voice.take
                  }
                >
                  <p
                    className={`table-pile-label ${
                      showDiscardPileGlow
                        ? "pile-interactable-label pile-interactable-label-discard"
                        : "text-theme-muted"
                    }`}
                  >
                    {voice.discard}
                  </p>
                  <div
                    className={`${PILE_CARD_SIZE} shrink-0 ${
                      showDiscardPileGlow
                        ? "pile-interactable-card pile-interactable-discard ring-2 ring-accent rounded-card"
                        : view.canSnap
                          ? "ring-1 ring-danger/50 rounded-card"
                          : ""
                    }`}
                  >
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
                          sizeClass={PILE_CARD_SIZE}
                        />
                      </motion.div>
                    </AnimatePresence>
                  </div>
                </button>

                <div className="table-pile flex flex-col items-center gap-0.5 lg:gap-1">
                  <p
                    className={`table-pile-label ${
                      isDrawnSlotMine ? "text-accent" : "text-theme-muted"
                    }`}
                  >
                    {voice.drawn}
                  </p>
                  <div
                    className={`${PILE_CARD_SIZE} shrink-0 ${
                      view.canSwap
                        ? "ring-2 ring-accent shadow-glow-accent rounded-card"
                        : ""
                    }`}
                  >
                    <PixelCard
                      card={view.drawnCard}
                      faceUp={isDrawnSlotMine}
                      hidden={showDrawnFaceDown}
                      empty={!isDrawnSlotMine && !view.hasDrawnCard}
                      sizeClass={PILE_CARD_SIZE}
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {view.phase === "lobby" ? (
            <LobbyPlayers view={view} voice={voice} />
          ) : (
            <div className="flex flex-1 flex-col gap-2 min-h-0 min-w-0">
              <p className="shrink-0 font-display text-[8px] text-theme-muted text-center tracking-widest">
                PLAYERS
              </p>

              {playersInDisplayOrder.length > 0 && (
                <PlayerScrollStage
                  centerIndex={Math.max(
                    0,
                    playersInDisplayOrder.findIndex(
                      (player) => player.id === view.playerId,
                    ),
                  )}
                >
                  {playersInDisplayOrder.map((player) => {
                    const isOwn = player.id === view.playerId;
                    return (
                      <PlayerSeat
                        key={player.id}
                        player={player}
                        viewerId={view.playerId}
                        phase={view.phase}
                        cambioCallerId={view.cambioCallerId}
                        fleetingPeek={fleetingPeek}
                        peekFlash={peekFlash}
                        swapFlash={swapFlash}
                        penaltyFlash={penaltyFlash}
                        selectedSwapCard={selectedSwapCard}
                        canSwap={isOwn ? view.canSwap : undefined}
                        canSnap={view.canSnap}
                        snapGiveActive={snapGiveActive}
                        swapAbilityActive={swapAbilityActive}
                        lookAbilityActive={lookAbilityActive}
                        pendingLookKind={pendingLookKind}
                        compact
                        voice={voice}
                        onCardClick={handleCardClick}
                      />
                    );
                  })}
                </PlayerScrollStage>
              )}
            </div>
          )}

          <div className="shrink-0 lg:hidden min-h-[2.75rem]">
            {actionButtons}
          </div>
        </div>

        <aside className="hidden lg:flex flex-col gap-4 lg:sticky lg:top-4">
          {actionButtons}
          {gameSidebar}
        </aside>
      </div>
    </div>
  );
}
