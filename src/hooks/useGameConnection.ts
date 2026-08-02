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
  ServerMessage,
} from "@/game/types";
import { freshSessionKey, getPartyHost, storageKey } from "@/lib/party";

const PEEK_FLASH_MS = 3500;
export const SWAP_FLASH_MS = 3000;
export const PENALTY_FLASH_MS = 2500;
export const CAMBIO_FLASH_MS = 3500;
export const PEEK_EFFECT_MS = PEEK_FLASH_MS;

export type FleetingPeek = {
  playerId: string;
  slot: number;
  card: Card;
};

export type PeekFlash = {
  kind: PeekFlashKind;
  actorId: string;
  playerId: string;
  slot: number;
};

export type SwapFlash = {
  slots: Array<{ playerId: string; slot: number }>;
};

export type PenaltyFlash = {
  playerId: string;
  slot: number;
};

export type CambioFlash = {
  playerId: string;
};

type ConnectionState = {
  connected: boolean;
  playerId: string | null;
  view: PlayerView | null;
  error: string | null;
  fleetingPeek: FleetingPeek | null;
  peekFlash: PeekFlash | null;
  swapFlash: SwapFlash | null;
  penaltyFlash: PenaltyFlash | null;
  cambioFlash: CambioFlash | null;
};

export type SessionMode = "new" | "reconnect";

export type SoloOptions = {
  botCount: number;
  difficulty: BotDifficulty;
};

function resolvePlayerId(roomId: string, sessionMode: SessionMode): string {
  const key = storageKey(roomId);
  const seenKey = freshSessionKey(roomId);
  const seenBefore = sessionStorage.getItem(seenKey) === "1";

  if (sessionMode === "new" && !seenBefore) {
    localStorage.removeItem(key);
  }

  const stored =
    localStorage.getItem(key) ?? sessionStorage.getItem(key) ?? undefined;

  const playerId = stored ?? nanoid(10);
  sessionStorage.setItem(key, playerId);
  return playerId;
}

export function useGameConnection(
  roomId: string,
  playerName: string,
  sessionMode: SessionMode = "reconnect",
  soloOptions?: SoloOptions,
) {
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
  });
  const socketRef = useRef<PartySocket | null>(null);
  const peekTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const peekEffectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const swapTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const penaltyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cambioTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const send = useCallback((message: ClientMessage) => {
    const socket = socketRef.current;
    if (!socket || socket.readyState !== WebSocket.OPEN) return;
    socket.send(JSON.stringify(message));
  }, []);

  useEffect(() => {
    const key = storageKey(roomId);
    const seenKey = freshSessionKey(roomId);
    const playerId = resolvePlayerId(roomId, sessionMode);

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
      },
    });

    socketRef.current = socket;

    socket.addEventListener("open", () => {
      setState((s) => ({ ...s, connected: true, error: null }));
    });

    socket.addEventListener("close", () => {
      setState((s) => ({ ...s, connected: false }));
    });

    socket.addEventListener("error", () => {
      setState((s) => ({
        ...s,
        error: s.error ?? "Could not connect to game server.",
      }));
    });

    socket.addEventListener("message", (event) => {
      const data = JSON.parse(event.data as string) as ServerMessage;

      if (data.type === "room_info") {
        localStorage.setItem(key, data.playerId);
        sessionStorage.setItem(key, data.playerId);
        sessionStorage.setItem(seenKey, "1");
        setState((s) => ({ ...s, playerId: data.playerId }));
      }

      if (data.type === "state") {
        setState((s) => ({ ...s, view: data.view, error: null }));
      }

      if (data.type === "secret_peek") {
        if (peekTimerRef.current) clearTimeout(peekTimerRef.current);
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
        if (peekEffectTimerRef.current)
          clearTimeout(peekEffectTimerRef.current);
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
        if (swapTimerRef.current) clearTimeout(swapTimerRef.current);
        setState((s) => ({
          ...s,
          swapFlash: { slots: data.slots },
        }));
        swapTimerRef.current = setTimeout(() => {
          setState((s) => ({ ...s, swapFlash: null }));
        }, SWAP_FLASH_MS);
      }

      if (data.type === "penalty_flash") {
        if (penaltyTimerRef.current) clearTimeout(penaltyTimerRef.current);
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
        if (cambioTimerRef.current) clearTimeout(cambioTimerRef.current);
        setState((s) => ({
          ...s,
          cambioFlash: { playerId: data.playerId },
        }));
        cambioTimerRef.current = setTimeout(() => {
          setState((s) => ({ ...s, cambioFlash: null }));
        }, CAMBIO_FLASH_MS);
      }

      if (data.type === "error") {
        setState((s) => ({ ...s, error: data.message }));
      }
    });

    return () => {
      if (peekTimerRef.current) clearTimeout(peekTimerRef.current);
      if (peekEffectTimerRef.current) clearTimeout(peekEffectTimerRef.current);
      if (swapTimerRef.current) clearTimeout(swapTimerRef.current);
      if (penaltyTimerRef.current) clearTimeout(penaltyTimerRef.current);
      if (cambioTimerRef.current) clearTimeout(cambioTimerRef.current);
      socket.close();
      socketRef.current = null;
    };
  }, [roomId, playerName, sessionMode, soloOptions]);

  return { ...state, send };
}
