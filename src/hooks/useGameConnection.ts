"use client";

import { getDefaultPlatformAdapters } from "@cambio/client/platform";
import { nanoid } from "nanoid";
import PartySocket from "partysocket";
import { useCallback, useEffect, useRef, useState } from "react";
import type { BotDifficulty, ClientMessage, PlayerView } from "@/game/types";
import { parseServerMessageJson } from "@/game/wire-schema";
import type { CambioFlash } from "@/hooks/useServerMessages";
import { useServerMessages } from "@/hooks/useServerMessages";
import { freshSessionKey, getPartyHost, storageKey } from "@/lib/party";
import { nextTransportConnectionError } from "@/lib/transport-connection-error";

export type {
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
} from "@/hooks/useServerMessages";
export {
  CAMBIO_FLASH_MS,
  DECK_DRAW_FLASH_MS,
  DISCARD_DRAW_FLASH_MS,
  PEEK_EFFECT_MS,
  PEEK_FLASH_MS,
  PENALTY_FLASH_MS,
  RESHUFFLE_FLASH_MS,
  SNAP_FLASH_MS,
  SWAP_FLASH_MS,
  TAKE_FLASH_MS,
} from "@/hooks/useServerMessages";

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

export type SessionMode = "new" | "reconnect";

export type SoloOptions = {
  botCount: number;
  difficulty: BotDifficulty;
};

export type MatchOptions = {
  targetSize: number;
  fillWithBots: boolean;
};

function resolvePlayerId(roomId: string): string {
  const platform = getDefaultPlatformAdapters();
  const key = storageKey(roomId);
  const stored =
    platform.persistentStorage.getItem(key) ??
    platform.sessionStorage.getItem(key) ??
    undefined;

  const playerId = stored ?? nanoid(10);
  platform.sessionStorage.setItem(key, playerId);
  return playerId;
}

export function useGameConnection(
  roomId: string,
  playerName: string,
  sessionMode: SessionMode = "reconnect",
  soloOptions?: SoloOptions,
  debugEnabled = false,
  matchOptions?: MatchOptions,
) {
  const [connected, setConnected] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const socketRef = useRef<PartySocket | null>(null);
  const cambioFlashRef = useRef<CambioFlash | null>(null);
  const viewRef = useRef<PlayerView | null>(null);

  const roomKeyRef = useRef(storageKey(roomId));
  const seenKeyRef = useRef(freshSessionKey(roomId));

  // Freeze connect query for the life of this room mount so URL cleanup
  // (dropping host/join) cannot tear down the socket and drop lobby seats.
  const connectQueryRef = useRef({
    sessionMode,
    soloOptions,
    matchOptions,
    debugEnabled,
  });

  const { messageState, applyMessage } = useServerMessages({
    onRoomInfo: (playerId) => {
      const platform = getDefaultPlatformAdapters();
      platform.persistentStorage.setItem(roomKeyRef.current, playerId);
      platform.sessionStorage.setItem(roomKeyRef.current, playerId);
      platform.sessionStorage.setItem(seenKeyRef.current, "1");
      setConnectionError((current) =>
        nextTransportConnectionError(current, "server_ack"),
      );
    },
    onViewChange: (view) => {
      viewRef.current = view;
      setConnectionError((current) =>
        nextTransportConnectionError(current, "server_ack"),
      );
    },
    onCambioFlashChange: (flash) => {
      cambioFlashRef.current = flash;
    },
  });

  const send = useCallback(
    (message: ClientMessage) => {
      const socket = socketRef.current;
      if (!socket || socket.readyState !== WebSocket.OPEN) return;
      if (
        cambioFlashRef.current &&
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

      if (message.type === "snap" && view?.playerId) {
        applyMessage({
          type: "snap_flash",
          actorId: view.playerId,
          playerId: message.targetPlayerId,
          slot: message.slot,
        });
      }
    },
    [applyMessage],
  );

  useEffect(() => {
    roomKeyRef.current = storageKey(roomId);
    seenKeyRef.current = freshSessionKey(roomId);
    const playerId = resolvePlayerId(roomId);
    const {
      sessionMode: mode,
      soloOptions: solo,
      matchOptions: match,
      debugEnabled: debug,
    } = connectQueryRef.current;

    const socket = new PartySocket({
      host: getPartyHost(),
      room: roomId,
      query: {
        name: playerName,
        playerId,
        ...(solo && mode === "new"
          ? {
              solo: "1",
              bots: String(solo.botCount),
              difficulty: solo.difficulty,
            }
          : {}),
        ...(match
          ? {
              match: "1",
              targetSize: String(match.targetSize),
              fillWithBots: match.fillWithBots ? "1" : "0",
            }
          : {}),
        ...(debug ? { debug: "1" } : {}),
      },
    });

    socketRef.current = socket;

    socket.addEventListener("open", () => {
      setConnected(true);
    });

    socket.addEventListener("close", () => {
      setConnected(false);
    });

    socket.addEventListener("error", () => {
      setConnected(false);
      setConnectionError((current) =>
        nextTransportConnectionError(current, "socket_error"),
      );
    });

    socket.addEventListener("message", (event) => {
      const data = parseServerMessageJson(event.data as string);
      if (!data) return;
      applyMessage(data);
    });

    return () => {
      cambioFlashRef.current = null;
      viewRef.current = null;
      socket.close();
      socketRef.current = null;
    };
  }, [roomId, playerName, applyMessage]);

  return {
    connected,
    ...messageState,
    error: messageState.error ?? connectionError,
    send,
  };
}
