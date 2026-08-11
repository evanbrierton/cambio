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

  const { messageState, applyMessage } = useServerMessages({
    onRoomInfo: (playerId) => {
      const platform = getDefaultPlatformAdapters();
      platform.persistentStorage.setItem(roomKeyRef.current, playerId);
      platform.sessionStorage.setItem(roomKeyRef.current, playerId);
      platform.sessionStorage.setItem(seenKeyRef.current, "1");
    },
    onViewChange: (view) => {
      viewRef.current = view;
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
        ...(matchOptions && sessionMode === "new"
          ? {
              match: "1",
              targetSize: String(matchOptions.targetSize),
              fillWithBots: matchOptions.fillWithBots ? "1" : "0",
            }
          : {}),
        ...(debugEnabled ? { debug: "1" } : {}),
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
      setConnectionError(
        (current) => current ?? "Could not connect to game server.",
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
  }, [
    roomId,
    playerName,
    sessionMode,
    soloOptions,
    debugEnabled,
    matchOptions,
    applyMessage,
  ]);

  return {
    connected,
    ...messageState,
    error: messageState.error ?? connectionError,
    send,
  };
}
