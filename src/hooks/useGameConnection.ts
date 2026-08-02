"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import PartySocket from "partysocket";
import { freshSessionKey, getPartyHost, storageKey } from "@/lib/party";
import type { Card, ClientMessage, PlayerView, ServerMessage } from "@/game/types";

const PEEK_FLASH_MS = 3500;

export type FleetingPeek = {
  playerId: string;
  slot: number;
  card: Card;
};

type ConnectionState = {
  connected: boolean;
  playerId: string | null;
  view: PlayerView | null;
  error: string | null;
  fleetingPeek: FleetingPeek | null;
};

export type SessionMode = "new" | "reconnect";

function resolvePlayerId(roomId: string, sessionMode: SessionMode): string {
  const key = storageKey(roomId);
  const seenKey = freshSessionKey(roomId);
  const seenBefore = sessionStorage.getItem(seenKey) === "1";

  if (sessionMode === "new" && !seenBefore) {
    localStorage.removeItem(key);
  }

  const stored =
    localStorage.getItem(key) ?? sessionStorage.getItem(key) ?? undefined;

  const playerId = stored ?? crypto.randomUUID().slice(0, 10);
  sessionStorage.setItem(key, playerId);
  return playerId;
}

export function useGameConnection(
  roomId: string,
  playerName: string,
  sessionMode: SessionMode = "reconnect",
) {
  const [state, setState] = useState<ConnectionState>({
    connected: false,
    playerId: null,
    view: null,
    error: null,
    fleetingPeek: null,
  });
  const socketRef = useRef<PartySocket | null>(null);
  const peekTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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
      },
    });

    socketRef.current = socket;

    socket.addEventListener("open", () => {
      setState((s) => ({ ...s, connected: true, error: null }));
    });

    socket.addEventListener("close", () => {
      setState((s) => ({ ...s, connected: false }));
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

      if (data.type === "error") {
        setState((s) => ({ ...s, error: data.message }));
      }
    });

    return () => {
      if (peekTimerRef.current) clearTimeout(peekTimerRef.current);
      socket.close();
      socketRef.current = null;
    };
  }, [roomId, playerName, sessionMode]);

  return { ...state, send };
}
