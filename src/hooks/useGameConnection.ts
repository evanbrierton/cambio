"use client";

import { nanoid } from "nanoid";
import PartySocket from "partysocket";
import { useCallback, useEffect, useRef, useState } from "react";
import type {
  BotDifficulty,
  Card,
  ClientMessage,
  PeekFlashKind,
  PlayerView,
} from "@/game/types";
import { parseServerMessageJson } from "@/game/wire-schema";
import { freshSessionKey, getPartyHost, storageKey } from "@/lib/party";

const PEEK_FLASH_MS = 3500;
export const SWAP_FLASH_MS = 3000;
export const PENALTY_FLASH_MS = 2500;
export const CAMBIO_FLASH_MS = 3500;
export const RESHUFFLE_FLASH_MS = 3500;
export const DISCARD_DRAW_FLASH_MS = 3000;
export const DECK_DRAW_FLASH_MS = 1500;
export const PEEK_EFFECT_MS = PEEK_FLASH_MS;

const PLAY_ACTIONS_BLOCKED_DURING_CAMBIO_FLASH = new Set<ClientMessage["type"]>(
  [
    "setup_peek",
    "draw",
    "swap",
    "discard_drawn",
    "call_cambio",
    "snap",
    "snap_give",
    "ability_look",
    "ability_swap",
  ],
);

const PLAY_ACTIONS_BLOCKED_DURING_SNAP_GIVE = new Set<ClientMessage["type"]>([
  "setup_peek",
  "draw",
  "swap",
  "discard_drawn",
  "call_cambio",
  "snap",
  "ability_look",
  "ability_swap",
]);

export interface FleetingPeek {
  playerId: string;
  slot: number;
  card: Card;
}

export interface PeekFlash {
  kind: PeekFlashKind;
  actorId: string;
  playerId: string;
  slot: number;
}

export interface SwapFlash {
  slots: Array<{ playerId: string; slot: number }>;
}

export interface PenaltyFlash {
  playerId: string;
  slot: number;
}

export interface CambioFlash {
  playerId: string;
}

export interface ReshuffleFlash {
  id: number;
}

export interface DiscardDrawFlash {
  playerId: string;
}

export interface DeckDrawFlash {
  playerId: string;
}

interface ConnectionState {
  connected: boolean;
  playerId: string | null;
  view: PlayerView | null;
  error: string | null;
  fleetingPeek: FleetingPeek | null;
  peekFlash: PeekFlash | null;
  swapFlash: SwapFlash | null;
  penaltyFlash: PenaltyFlash | null;
  cambioFlash: CambioFlash | null;
  reshuffleFlash: ReshuffleFlash | null;
  discardDrawFlash: DiscardDrawFlash | null;
  deckDrawFlash: DeckDrawFlash | null;
}

export type SessionMode = "new" | "reconnect";

export interface SoloOptions {
  botCount: number;
  difficulty: BotDifficulty;
}

function resolvePlayerId(roomId: string): string {
  const key = storageKey(roomId);
  const stored =
    localStorage.getItem(key) ?? sessionStorage.getItem(key) ?? undefined;

  const playerId = stored ?? nanoid(10);
  sessionStorage.setItem(key, playerId);
  return playerId;
}

export function useGameConnection({
  roomId,
  playerName,
  sessionMode = "reconnect",
  soloOptions,
  debugEnabled = false,
}: {
  roomId: string;
  playerName: string;
  sessionMode?: SessionMode;
  soloOptions?: SoloOptions;
  debugEnabled?: boolean;
}) {
  const [state, setState] = useState<ConnectionState>({
    connected: false,
    playerId: null,
    view: null,
    error: null,
    fleetingPeek: null,
    peekFlash: null,
    swapFlash: null,
    penaltyFlash: null,
    cambioFlash: null,
    reshuffleFlash: null,
    discardDrawFlash: null,
    deckDrawFlash: null,
  });
  const socketRef = useRef<PartySocket | null>(null);
  const peekTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const peekEffectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const swapTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const penaltyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cambioTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reshuffleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const discardDrawTimerRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
  const deckDrawTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cambioFlashRef = useRef<CambioFlash | null>(null);
  const viewRef = useRef<PlayerView | null>(null);

  const send = useCallback((message: ClientMessage) => {
    const socket = socketRef.current;
    if (socket === null || socket.readyState !== WebSocket.OPEN) {
      return;
    }
    if (
      cambioFlashRef.current !== null &&
      PLAY_ACTIONS_BLOCKED_DURING_CAMBIO_FLASH.has(message.type)
    ) {
      return;
    }
    const view = viewRef.current;
    if (view?.snapGivePending) {
      const isSnapGiver = view.pendingAbility?.kind === "snap_give";
      if (isSnapGiver) {
        if (
          message.type !== "snap_give" &&
          PLAY_ACTIONS_BLOCKED_DURING_SNAP_GIVE.has(message.type)
        ) {
          return;
        }
      } else if (
        PLAY_ACTIONS_BLOCKED_DURING_SNAP_GIVE.has(message.type) ||
        message.type === "snap_give"
      ) {
        return;
      }
    }
    socket.send(JSON.stringify(message));
  }, []);

  useEffect(() => {
    const key = storageKey(roomId);
    const seenKey = freshSessionKey(roomId);
    const playerId = resolvePlayerId(roomId);

    const socket = new PartySocket({
      host: getPartyHost(),
      room: roomId,
      query: {
        name: playerName,
        playerId,
        ...(soloOptions && sessionMode === "new"
          ? {
              solo: "1",
              bots: String(soloOptions.botCount),
              difficulty: soloOptions.difficulty,
            }
          : {}),
        ...(debugEnabled ? { debug: "1" } : {}),
      },
    });

    socketRef.current = socket;

    socket.addEventListener("open", () => {
      // Do not clear `error` here. PartySocket may emit `open` during a
      // reconnect attempt that still fails; clearing would flash connecting
      // UI before the could-not-connect error returns. Clear only once the
      // server acknowledges us (room_info / state).
      setState((s) => ({ ...s, connected: true }));
    });

    socket.addEventListener("close", () => {
      setState((s) => ({ ...s, connected: false }));
    });

    socket.addEventListener("error", () => {
      setState((s) => ({
        ...s,
        connected: false,
        error: s.error ?? "Could not connect to game server.",
      }));
    });

    socket.addEventListener("message", (event) => {
      const data = parseServerMessageJson(event.data as string);
      if (!data) {
        return;
      }

      if (data.type === "room_info") {
        localStorage.setItem(key, data.playerId);
        sessionStorage.setItem(key, data.playerId);
        sessionStorage.setItem(seenKey, "1");
        setState((s) => ({ ...s, playerId: data.playerId, error: null }));
      }

      if (data.type === "state") {
        viewRef.current = data.view;
        setState((s) => ({ ...s, view: data.view, error: null }));
      }

      if (data.type === "secret_peek") {
        if (peekTimerRef.current !== null) {
          clearTimeout(peekTimerRef.current);
        }
        setState((s) => ({
          ...s,
          fleetingPeek: {
            playerId: data.playerId,
            slot: data.slot,
            card: data.card,
          },
        }));
        peekTimerRef.current = setTimeout(() => {
          setState((s) => ({ ...s, fleetingPeek: null }));
        }, PEEK_FLASH_MS);
      }

      if (data.type === "peek_flash") {
        if (peekEffectTimerRef.current !== null) {
          clearTimeout(peekEffectTimerRef.current);
        }
        setState((s) => ({
          ...s,
          peekFlash: {
            kind: data.kind,
            actorId: data.actorId,
            playerId: data.playerId,
            slot: data.slot,
          },
        }));
        peekEffectTimerRef.current = setTimeout(() => {
          setState((s) => ({ ...s, peekFlash: null }));
        }, PEEK_FLASH_MS);
      }

      if (data.type === "swap_flash") {
        if (swapTimerRef.current !== null) {
          clearTimeout(swapTimerRef.current);
        }
        setState((s) => ({
          ...s,
          swapFlash: { slots: data.slots },
        }));
        swapTimerRef.current = setTimeout(() => {
          setState((s) => ({ ...s, swapFlash: null }));
        }, SWAP_FLASH_MS);
      }

      if (data.type === "penalty_flash") {
        if (penaltyTimerRef.current !== null) {
          clearTimeout(penaltyTimerRef.current);
        }
        setState((s) => ({
          ...s,
          penaltyFlash: {
            playerId: data.playerId,
            slot: data.slot,
          },
        }));
        penaltyTimerRef.current = setTimeout(() => {
          setState((s) => ({ ...s, penaltyFlash: null }));
        }, PENALTY_FLASH_MS);
      }

      if (data.type === "cambio_flash") {
        if (cambioTimerRef.current !== null) {
          clearTimeout(cambioTimerRef.current);
        }
        const flash = { playerId: data.playerId };
        cambioFlashRef.current = flash;
        setState((s) => ({
          ...s,
          cambioFlash: flash,
        }));
        cambioTimerRef.current = setTimeout(() => {
          cambioFlashRef.current = null;
          setState((s) => ({ ...s, cambioFlash: null }));
        }, CAMBIO_FLASH_MS);
      }

      if (data.type === "reshuffle_flash") {
        if (reshuffleTimerRef.current !== null) {
          clearTimeout(reshuffleTimerRef.current);
        }
        setState((s) => ({
          ...s,
          reshuffleFlash: { id: (s.reshuffleFlash?.id ?? 0) + 1 },
        }));
        reshuffleTimerRef.current = setTimeout(() => {
          setState((s) => ({ ...s, reshuffleFlash: null }));
        }, RESHUFFLE_FLASH_MS);
      }

      if (data.type === "discard_draw_flash") {
        if (discardDrawTimerRef.current !== null) {
          clearTimeout(discardDrawTimerRef.current);
        }
        setState((s) => ({
          ...s,
          discardDrawFlash: { playerId: data.playerId },
        }));
        discardDrawTimerRef.current = setTimeout(() => {
          setState((s) => ({ ...s, discardDrawFlash: null }));
        }, DISCARD_DRAW_FLASH_MS);
      }

      if (data.type === "deck_draw_flash") {
        if (deckDrawTimerRef.current !== null) {
          clearTimeout(deckDrawTimerRef.current);
        }
        setState((s) => ({
          ...s,
          deckDrawFlash: { playerId: data.playerId },
        }));
        deckDrawTimerRef.current = setTimeout(() => {
          setState((s) => ({ ...s, deckDrawFlash: null }));
        }, DECK_DRAW_FLASH_MS);
      }

      if (data.type === "error") {
        setState((s) => ({ ...s, error: data.message }));
      }
    });

    return () => {
      if (peekTimerRef.current !== null) {
        clearTimeout(peekTimerRef.current);
      }
      if (peekEffectTimerRef.current !== null) {
        clearTimeout(peekEffectTimerRef.current);
      }
      if (swapTimerRef.current !== null) {
        clearTimeout(swapTimerRef.current);
      }
      if (penaltyTimerRef.current !== null) {
        clearTimeout(penaltyTimerRef.current);
      }
      if (cambioTimerRef.current !== null) {
        clearTimeout(cambioTimerRef.current);
      }
      if (reshuffleTimerRef.current !== null) {
        clearTimeout(reshuffleTimerRef.current);
      }
      if (discardDrawTimerRef.current !== null) {
        clearTimeout(discardDrawTimerRef.current);
      }
      if (deckDrawTimerRef.current !== null) {
        clearTimeout(deckDrawTimerRef.current);
      }
      cambioFlashRef.current = null;
      viewRef.current = null;
      socket.close();
      socketRef.current = null;
    };
  }, [roomId, playerName, sessionMode, soloOptions, debugEnabled]);

  return { ...state, send };
}
