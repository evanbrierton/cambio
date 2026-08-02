"use client";

import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useMemo, useState } from "react";
import { GameOverScreen } from "@/components/game/GameOverScreen";
import { WaitingScreen } from "@/components/game/WaitingScreen";
import { PixelCard, TABLE_CARD_SIZE } from "@/components/cards/PixelCard";
import { RetroButton } from "@/components/ui/RetroButton";
import { ThemePicker } from "@/components/ui/ThemePicker";
import type { ClientMessage, PendingAbility, PlayerView, PublicPlayer } from "@/game/types";
import { SETUP_PEEK_SLOTS } from "@/game/types";
import { cardLabel, isRed, suitGlyph } from "@/game/cards";
import type { FleetingPeek } from "@/hooks/useGameConnection";
import { useGameSounds } from "@/hooks/useGameSounds";
import { useSoundEnabled } from "@/hooks/useSoundEnabled";
import { useThemeVoice } from "@/hooks/useThemeVoice";
import type { ThemeVoice } from "@/lib/themes";

type GameTableProps = {
  view: PlayerView;
  connected: boolean;
  error: string | null;
  fleetingPeek: FleetingPeek | null;
  send: (message: ClientMessage) => void;
};

type SelectedCard = { playerId: string; slot: number };

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
): { text: string; tone: "swap" | "action" | "snap" | "turn" } | null {
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
    return { text: voice.drawHint, tone: "turn" };
  }
  if (view.canDiscardDrawn) {
    return { text: voice.discardHint, tone: "turn" };
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
  const canPickForAbility =
    swapAbilityActive && (!isProtectedTarget || isOwn);
  const showAbilitySwapHint = swapAbilityActive && canPickForAbility;
  const showSnapTarget =
    canSnap && !snapGiveActive && (!isProtectedTarget || isOwn);
  const hasSwapFirstSelected =
    swapAbilityActive &&
    selectedSwapCard?.playerId === player.id;

  const canPickForLook = (slotIndex: number) => {
    if (!lookAbilityActive || !pendingLookKind) return false;
    if (pendingLookKind === "peek_own") return isOwn;
    if (pendingLookKind === "spy") return !isOwn && !isProtectedTarget;
    if (pendingLookKind === "queen_look" || pendingLookKind === "king_look") {
      return !isProtectedTarget || isOwn;
    }
    return false;
  };

  const showLookSeatHint =
    lookAbilityActive && player.hand.some((_, index) => canPickForLook(index));

  const seatPadding = compact ? "p-2" : "p-3 sm:p-4";
  const cardGridWidth = compact ? "w-[120px]" : "w-[168px] sm:w-[184px]";

  return (
    <section
      className={`pixel-border ${seatPadding} w-full min-w-0 ${
        showDrawnSwapHint || showSnapGiveHint
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
        lookAbilityActive && !showLookSeatHint && !isOwn && pendingLookKind === "peek_own"
          ? "opacity-40"
          : ""
      } ${
        lookAbilityActive && !showLookSeatHint && isOwn && pendingLookKind === "spy"
          ? "opacity-40"
          : ""
      } ${
        isOwn && !showDrawnSwapHint ? "lg:ring-1 lg:ring-accent" : ""
      } ${swapAbilityActive && isProtectedTarget && !isOwn ? "opacity-40" : ""}`}
    >
      <div className={`flex flex-wrap items-center justify-center sm:justify-start gap-1.5 sm:gap-2 ${compact ? "mb-2" : "mb-3"}`}>
        <h2 className={`player-name ${compact ? "text-[10px]" : "text-xs sm:text-sm"}`}>
          {player.name}
        </h2>
        {isOwn && (
          <span className="ui-badge text-theme-muted">(you)</span>
        )}
        {showDrawnSwapHint && (
          <span className="ui-badge text-accent animate-pulse">
            {voice.tapToSwap}
          </span>
        )}
        {showSnapGiveHint && (
          <span className="ui-badge text-accent animate-pulse">
            {voice.snapGiveHint}
          </span>
        )}
        {showLookSeatHint && pendingLookKind === "spy" && (
          <span className="ui-badge text-accent-alt animate-pulse">
            SPY
          </span>
        )}
        {showLookSeatHint &&
          (pendingLookKind === "queen_look" || pendingLookKind === "king_look") && (
            <span className="ui-badge text-accent-alt animate-pulse">
              LOOK
            </span>
          )}
        {showLookSeatHint && pendingLookKind === "peek_own" && (
          <span className="ui-badge text-accent-alt animate-pulse">
            PEEK
          </span>
        )}
        {showSetupPeekHint && (
          <span className="ui-badge text-accent-alt animate-pulse">
            PEEK
          </span>
        )}
        {hasSwapFirstSelected && (
          <span className="ui-badge text-accent-alt animate-pulse">
            CARD 1
          </span>
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
          <span className="ui-badge text-accent-soft">
            {voice.cambio}
          </span>
        )}
        {!player.connected && (
          <span className="ui-badge text-theme-muted">{voice.away}</span>
        )}
        {player.isWaiting && (
          <span className="ui-badge text-theme-muted">{voice.waitingBadge}</span>
        )}
        {player.penaltyCount > 0 && (
          <span className="ui-badge text-accent">
            {voice.penalty(player.penaltyCount)}
          </span>
        )}
      </div>
      {player.isWaiting && phase !== "lobby" ? (
        <p className="font-display text-[10px] text-theme-muted text-center py-6">
          {voice.waitingBadge}
        </p>
      ) : (
      <div className={`grid grid-cols-2 gap-1.5 sm:gap-3 ${cardGridWidth} mx-auto`}>
        {player.hand.map((slot, index) => {
          const isFleetingPeek =
            fleetingPeek?.playerId === player.id && fleetingPeek.slot === index;
          const setupLocked =
            phase === "setup_peek" &&
            (!isOwn || !SETUP_PEEK_SLOTS.includes(index));
          const abilityLocked = swapAbilityActive && !canPickForAbility;
          const lookLocked = lookAbilityActive && !canPickForLook(index);
          const isSelectedForSwap =
            selectedSwapCard?.playerId === player.id &&
            selectedSwapCard.slot === index;

          return (
            <PixelCard
              key={index}
              card={isFleetingPeek ? fleetingPeek.card : slot.card}
              hidden={!isFleetingPeek && slot.hidden}
              faceUp={isFleetingPeek || slot.faceUp}
              revealing={isFleetingPeek}
              small={compact}
              swapFirstSelected={isSelectedForSwap && swapAbilityActive}
              highlightSwap={
                (showDrawnSwapHint && !setupLocked) ||
                (showSnapGiveHint && !setupLocked) ||
                (showAbilitySwapHint && !setupLocked && !abilityLocked)
              }
              highlightAction={
                (showSetupPeekHint &&
                  SETUP_PEEK_SLOTS.includes(index) &&
                  !setupLocked) ||
                (lookAbilityActive && canPickForLook(index))
              }
              highlightSnap={showSnapTarget && !setupLocked && !lookAbilityActive && !swapAbilityActive && !snapGiveActive}
              isPenalty={isOwn && slot.isPenalty}
              onClick={
                setupLocked || abilityLocked || lookLocked
                  ? undefined
                  : () => onCardClick(player.id, index, isOwn)
              }
              disabled={setupLocked || abilityLocked || lookLocked}
            />
          );
        })}
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
  send,
}: GameTableProps) {
  const voice = useThemeVoice();
  const { soundEnabled, toggleSound } = useSoundEnabled();
  useGameSounds(view, error, fleetingPeek);
  const [selectedSwapCard, setSelectedSwapCard] = useState<SelectedCard | null>(
    null,
  );
  const [roomCopied, setRoomCopied] = useState(false);
  const isCrowded = view.players.length >= 5;

  const swapAbilityActive = isSwapAbility(view.pendingAbility?.kind);
  const snapGiveActive = view.pendingAbility?.kind === "snap_give";
  const lookAbilityActive = isLookAbility(view.pendingAbility?.kind);
  const pendingLookKind = lookAbilityActive
    ? view.pendingAbility?.kind ?? null
    : null;
  const actionBanner = getActionBanner(
    view,
    voice,
    swapAbilityActive,
    selectedSwapCard,
  );

  useEffect(() => {
    if (!swapAbilityActive) {
      setSelectedSwapCard(null);
    }
  }, [swapAbilityActive, view.pendingAbility?.kind]);

  const otherPlayersInOrder = useMemo(() => {
    const selfIndex = view.players.findIndex((p) => p.id === view.playerId);
    if (selfIndex === -1) return [];
    const ordered: PublicPlayer[] = [];
    for (let i = 1; i < view.players.length; i++) {
      ordered.push(view.players[(selfIndex + i) % view.players.length]);
    }
    return ordered;
  }, [view.players, view.playerId]);

  if (view.isWaiting) {
    return <WaitingScreen view={view} connected={connected} />;
  }

  if (view.phase === "ended") {
    return (
      <GameOverScreen view={view} connected={connected} send={send} />
    );
  }

  const me = view.players.find((p) => p.id === view.playerId);
  const isHost = me?.isHost ?? false;
  const self = view.players.find((p) => p.id === view.playerId);

  const phaseLabel = voice.phases[view.phase] ?? "";

  const handleCardClick = (
    playerId: string,
    slot: number,
    isOwn: boolean,
  ) => {
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

  const copyRoomCode = async () => {
    try {
      await navigator.clipboard.writeText(view.roomId);
      setRoomCopied(true);
      window.setTimeout(() => setRoomCopied(false), 2000);
    } catch {
      setRoomCopied(false);
    }
  };

  const actionButtons = (
    <div className="flex flex-wrap gap-2 sm:gap-3 justify-center lg:justify-start">
      {view.canStartGame && (
        <RetroButton onClick={() => send({ type: "start_game" })}>
          {voice.startGame}
        </RetroButton>
      )}

      {view.canCallCambio && (
        <RetroButton variant="danger" onClick={() => send({ type: "call_cambio" })}>
          {voice.callCambio}
        </RetroButton>
      )}

      {isHost && view.phase !== "lobby" && (
        <RetroButton
          variant="secondary"
          onClick={() => send({ type: "toggle_debug" })}
        >
          {view.debugReveal ? voice.debugHide : voice.debugReveal}
        </RetroButton>
      )}
    </div>
  );

  return (
    <div className="w-full max-w-7xl mx-auto">
      <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(260px,300px)] lg:gap-6 lg:items-start">
        <div className="flex flex-col gap-4 sm:gap-5 min-w-0">
          <header className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <p className="font-display text-theme-muted text-[10px] sm:text-xs">
                  {voice.roomPrefix} {view.roomId.toUpperCase()}
                </p>
                <button
                  type="button"
                  onClick={copyRoomCode}
                  className="chip-btn text-[8px] px-2 py-1 border-theme-muted text-theme hover:border-accent transition-colors"
                >
                  {roomCopied ? voice.copied : voice.copy}
                </button>
              </div>
              <h1 className="font-display text-base sm:text-xl lg:text-2xl title-glow mt-1">
                {phaseLabel}
              </h1>
              {view.debugReveal && (
                <p className="font-display text-[8px] text-accent-alt mt-1">
                  DEBUG: ALL CARDS VISIBLE
                </p>
              )}
            </div>
            <div className="flex items-center gap-3">
              <Link
                href="/"
                className="chip-btn text-[8px] px-2 py-1 border-theme-muted text-theme hover:border-accent transition-colors"
              >
                {voice.leaveGame}
              </Link>
              <div className="font-display text-[10px] text-theme-muted">
                {connected ? voice.online : voice.reconnecting}
              </div>
            </div>
          </header>

          {error && (
            <div className="pixel-border bg-danger-surface text-danger-text font-display text-xs p-3">
              {error}
            </div>
          )}

          {fleetingPeek && (
            <div className="pixel-border bg-surface-elevated p-3 font-display text-[10px] text-theme animate-pulse text-center">
              <span>{voice.memorizePrefix} </span>
              <span className={isRed(fleetingPeek.card) ? "card-red" : "card-black"}>
                {cardLabel(fleetingPeek.card)}
                {fleetingPeek.card.rank !== "JOKER" && (
                  <span className="text-base ml-1">{suitGlyph(fleetingPeek.card.suit)}</span>
                )}
              </span>
            </div>
          )}

          {actionBanner && !swapAbilityActive && (
            <div
              className={`pixel-border p-3 font-display text-[10px] text-center ${
                actionBanner.tone === "snap"
                  ? "bg-snap-hint ring-1 ring-danger/50 text-danger-text"
                  : actionBanner.tone === "turn"
                    ? "bg-swap-hint ring-2 ring-accent text-accent animate-pulse"
                    : "bg-action-hint ring-2 ring-accent-alt text-accent-alt animate-pulse"
              }`}
            >
              {actionBanner.text}
            </div>
          )}

          {swapAbilityActive && (
            <div
              className={`pixel-border p-3 font-display text-[10px] text-center ${
                selectedSwapCard
                  ? "bg-swap-first-selected ring-2 ring-accent-alt text-accent-alt"
                  : "bg-surface-elevated text-accent"
              }`}
            >
              <p className={selectedSwapCard ? "animate-pulse" : ""}>
                {selectedSwapCard
                  ? voice.swapAbilityFirstSelected
                  : voice.swapAbilityHint}
              </p>
              {selectedSwapCard && (
                <button
                  type="button"
                  onClick={() => setSelectedSwapCard(null)}
                  className="chip-btn mt-2 text-[8px] px-2 py-1 border-accent-alt text-accent-alt hover:border-accent transition-colors"
                >
                  {voice.swapAbilityCancel}
                </button>
              )}
            </div>
          )}

          <div
            className={`pixel-border bg-surface p-4 sm:p-5 ${
              view.canDraw ? "ring-2 ring-accent-alt" : ""
            }`}
          >
            <div className="flex flex-wrap items-end justify-center gap-8 sm:gap-10">
              <div className="table-pile flex flex-col items-center gap-2">
                <p className="table-pile-label text-theme-muted">{voice.deck}</p>
                <div
                  className={`table-pile-card pixel-border rounded-card ${TABLE_CARD_SIZE} bg-surface-card flex items-center justify-center font-display text-on-card text-xs shrink-0`}
                >
                  {view.deckCount}
                </div>
                <div className="table-pile-action">
                  {view.canDraw && (
                    <RetroButton onClick={() => send({ type: "draw", source: "deck" })}>
                      {voice.draw}
                    </RetroButton>
                  )}
                </div>
              </div>

              <div className="table-pile flex flex-col items-center gap-2">
                <div className="table-pile-labels">
                  <p className="table-pile-label text-theme-muted">{voice.discard}</p>
                  {view.canSnap ? (
                    <p className="table-pile-label text-danger-text/80 mt-1">
                      {voice.snap}
                    </p>
                  ) : (
                    <span className="block h-[1.25rem]" aria-hidden />
                  )}
                </div>
                <div
                  className={
                    view.canSnap
                      ? "ring-1 ring-danger/50 rounded-card shrink-0"
                      : "shrink-0"
                  }
                >
                  <AnimatePresence mode="popLayout">
                    <motion.div
                      key={view.discardTop?.id ?? "empty-discard"}
                      initial={{ scale: 1.25, y: -16, opacity: 0 }}
                      animate={{ scale: 1, y: 0, opacity: 1 }}
                      exit={{ scale: 0.85, opacity: 0 }}
                      transition={{ type: "spring", stiffness: 420, damping: 26 }}
                    >
                      <PixelCard
                        card={view.discardTop}
                        faceUp={!!view.discardTop}
                        hidden={!view.discardTop}
                      />
                    </motion.div>
                  </AnimatePresence>
                </div>
                <div className="table-pile-action">
                  {view.canDraw && view.discardTop && (
                    <RetroButton
                      variant="secondary"
                      onClick={() => send({ type: "draw", source: "discard" })}
                    >
                      {voice.take}
                    </RetroButton>
                  )}
                </div>
              </div>

              {view.drawnCard && (
                <div className="table-pile flex flex-col items-center gap-2">
                  <p className="table-pile-label text-accent">{voice.drawn}</p>
                  <div
                    className={`shrink-0 ${
                      view.canSwap
                        ? "ring-2 ring-accent animate-pulse shadow-glow-accent rounded-card"
                        : ""
                    }`}
                  >
                    <PixelCard card={view.drawnCard} faceUp />
                  </div>
                  <div className="table-pile-action" />
                </div>
              )}
            </div>
            {view.canDiscardDrawn && (
              <div className="flex justify-center mt-4">
                <RetroButton
                  variant="secondary"
                  onClick={() => send({ type: "discard_drawn" })}
                >
                  {voice.discardDrawn}
                </RetroButton>
              </div>
            )}
          </div>

          {self && (
            <PlayerSeat
              player={self}
              viewerId={view.playerId}
              phase={view.phase}
              cambioCallerId={view.cambioCallerId}
              fleetingPeek={fleetingPeek}
              selectedSwapCard={selectedSwapCard}
              canSwap={view.canSwap}
              canSnap={view.canSnap}
              snapGiveActive={snapGiveActive}
              swapAbilityActive={swapAbilityActive}
              lookAbilityActive={lookAbilityActive}
              pendingLookKind={pendingLookKind}
              voice={voice}
              onCardClick={handleCardClick}
            />
          )}

          {otherPlayersInOrder.length > 0 && (
            <div
              className={
                otherPlayersInOrder.length >= 3
                  ? "grid grid-cols-1 min-[480px]:grid-cols-2 gap-2 sm:gap-3 max-h-[52vh] overflow-y-auto overscroll-contain pr-0.5"
                  : "flex flex-col gap-3"
              }
            >
              {otherPlayersInOrder.map((player) => (
                <PlayerSeat
                  key={player.id}
                  player={player}
                  viewerId={view.playerId}
                  phase={view.phase}
                  cambioCallerId={view.cambioCallerId}
                  fleetingPeek={fleetingPeek}
                  selectedSwapCard={selectedSwapCard}
                  canSnap={view.canSnap}
                  snapGiveActive={snapGiveActive}
                  swapAbilityActive={swapAbilityActive}
                  lookAbilityActive={lookAbilityActive}
                  pendingLookKind={pendingLookKind}
                  compact={isCrowded}
                  voice={voice}
                  onCardClick={handleCardClick}
                />
              ))}
            </div>
          )}

          <div className="lg:hidden">{actionButtons}</div>
        </div>

        <aside className="mt-6 lg:mt-0 flex flex-col gap-4 lg:sticky lg:top-4">
          <div className="hidden lg:block">{actionButtons}</div>

          <button
            type="button"
            onClick={toggleSound}
            className="chip-btn text-[8px] px-2 py-1 border-theme-muted text-theme hover:border-accent transition-colors self-start"
          >
            {soundEnabled ? voice.soundOn : voice.soundOff}
          </button>

          <ThemePicker compact />

          <div className="pixel-border p-3 flex-1 min-h-[120px] lg:min-h-[200px] lg:max-h-[50vh] overflow-y-auto bg-surface">
            <p className="font-display text-[8px] text-theme-muted mb-2">{voice.gameLog}</p>
            {view.log.slice(-12).map((line, i) => (
              <p
                key={i}
                className="font-mono text-[10px] text-theme-muted leading-relaxed"
              >
                {line}
              </p>
            ))}
          </div>
        </aside>
      </div>
    </div>
  );
}
