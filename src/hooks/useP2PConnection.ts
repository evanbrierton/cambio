"use client";

import { getDefaultPlatformAdapters } from "@cambio/client/platform";
import { nanoid } from "nanoid";
import { useCallback, useEffect, useRef, useState } from "react";
import type { ClientMessage, PlayerView } from "@/game/types";
import type { CambioFlash } from "@/hooks/useServerMessages";
import { useServerMessages } from "@/hooks/useServerMessages";
import { useHostReliability } from "@/hooks/useHostReliability";
import {
  createDevBridgeWebSocketFactory,
  registerDevBridgeHost,
} from "@/p2p/lan-dev-bridge";
import { isLocalDevEndpoint, parseLanEndpoint } from "@/p2p/lan-endpoint";
import {
  createLanGuestTransport,
  type LanGuestTransport,
} from "@/p2p/lan-transport";
import { P2PHostSession } from "@/p2p/p2p-host-session";
import { freshSessionKey, storageKey } from "@/lib/party";
import { nextTransportConnectionError } from "@/lib/transport-connection-error";
import type {
  MatchOptions,
  SessionMode,
  SoloOptions,
} from "@/hooks/useGameConnection";

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

export type P2PRole = "host" | "guest";

export type P2PConnectionOptions = {
  enabled?: boolean;
  role: P2PRole;
  endpoint?: string | null;
  sessionMode?: SessionMode;
  soloOptions?: SoloOptions;
  debugEnabled?: boolean;
  matchOptions?: MatchOptions;
};

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

function resolveHostIp(role: P2PRole, endpoint: string | null | undefined): string {
  if (role === "guest") {
    return parseLanEndpoint(endpoint)?.hostIp ?? "127.0.0.1";
  }
  if (typeof window !== "undefined" && window.location.hostname) {
    return window.location.hostname;
  }
  return "127.0.0.1";
}

const idleP2PState = {
  connected: false,
  playerId: null,
  view: null,
  error: null,
  fleetingPeek: null,
  peekFlash: null,
  swapFlash: null,
  takeFlash: null,
  snapFlash: null,
  penaltyFlash: null,
  cambioFlash: null,
  reshuffleFlash: null,
  discardDrawFlash: null,
  deckDrawFlash: null,
  send: (_message: ClientMessage) => {},
};

export function useP2PConnection(
  roomId: string,
  playerName: string,
  options: P2PConnectionOptions,
) {
  const {
    enabled = true,
    role,
    endpoint = null,
    sessionMode = "reconnect",
    soloOptions,
    debugEnabled = false,
    matchOptions,
  } = options;

  const [connected, setConnected] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const cambioFlashRef = useRef<CambioFlash | null>(null);
  const viewRef = useRef<PlayerView | null>(null);
  const hostSessionRef = useRef<P2PHostSession | null>(null);
  const guestTransportRef = useRef<LanGuestTransport | null>(null);
  const hostPlayerIdRef = useRef<string | null>(null);
  const joinedRef = useRef(false);

  const roomKeyRef = useRef(storageKey(roomId));
  const seenKeyRef = useRef(freshSessionKey(roomId));

  const connectQueryRef = useRef({
    sessionMode,
    soloOptions,
    matchOptions,
    debugEnabled,
    role,
    endpoint,
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

  const gameActive =
    messageState.view != null &&
    messageState.view.phase !== "lobby" &&
    messageState.view.phase !== "ended";

  useHostReliability({
    enabled: role === "host",
    gameActive,
    onVisibilityHidden: () => {
      void hostSessionRef.current?.gameHost.pauseForHostVisibility();
    },
    onVisibilityVisible: () => {
      void hostSessionRef.current?.gameHost.resumeFromHostVisibility();
    },
  });

  const send = useCallback(
    (message: ClientMessage) => {
      if (!enabled) return;

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

      if (role === "guest") {
        const transport = guestTransportRef.current;
        if (!transport) return;
        if (!transport.send(message)) return;
      } else {
        const session = hostSessionRef.current;
        const hostPlayerId = hostPlayerIdRef.current ?? messageState.playerId;
        if (!session || !hostPlayerId) return;
        void session.gameHost.dispatchMessage(hostPlayerId, message, (error) => {
          applyMessage({ type: "error", message: error });
        });
      }

      if (message.type === "snap" && view?.playerId) {
        applyMessage({
          type: "snap_flash",
          actorId: view.playerId,
          playerId: message.targetPlayerId,
          slot: message.slot,
        });
      }
    },
    [applyMessage, enabled, messageState.playerId, role],
  );

  useEffect(() => {
    if (!enabled) {
      setConnected(false);
      return;
    }

    roomKeyRef.current = storageKey(roomId);
    seenKeyRef.current = freshSessionKey(roomId);
    const playerId = resolvePlayerId(roomId);
    const {
      sessionMode: mode,
      soloOptions: solo,
      matchOptions: match,
      debugEnabled: debug,
      role: connectRole,
      endpoint: connectEndpoint,
    } = connectQueryRef.current;

    joinedRef.current = false;
    let devBridgeCleanup: (() => void) | null = null;

    if (connectRole === "host") {
      const hostIp = resolveHostIp("host", connectEndpoint);
      const parsedEndpoint = parseLanEndpoint(connectEndpoint);
      const session = new P2PHostSession({
        roomId,
        hostIp,
        port: parsedEndpoint?.port,
        debugEnabled: debug,
        onLocalMessage: (message) => {
          applyMessage(message);
        },
      });
      hostSessionRef.current = session;

      devBridgeCleanup =
        registerDevBridgeHost(roomId, (socket) => {
          session.registerGuestSocket(socket);
        }) ?? null;

      void session
        .connectLocalHost({
          queryPlayerId: playerId,
          name: playerName,
          isSolo: Boolean(solo && mode === "new"),
          botCount: solo?.botCount ?? 1,
          difficulty: solo?.difficulty ?? "easy",
          isMatchmade: Boolean(match),
          matchTargetSize: match?.targetSize,
          matchFillWithBots: match?.fillWithBots,
        })
        .then((result) => {
          if (result.error) {
            setConnectionError(result.error);
            return;
          }
          hostPlayerIdRef.current = result.playerId;
          setConnected(true);
        });
    } else {
      const parsedEndpoint = parseLanEndpoint(connectEndpoint);
      if (!parsedEndpoint) {
        setConnectionError("Enter a valid host endpoint (IP:port).");
        return;
      }

      const devFactory = isLocalDevEndpoint(parsedEndpoint)
        ? createDevBridgeWebSocketFactory(roomId)
        : null;

      const transport = createLanGuestTransport(
        {
          mode: "local",
          roomId,
          hostIp: parsedEndpoint.hostIp,
          port: parsedEndpoint.port,
        },
        {
          webSocketFactory: devFactory ?? undefined,
          onEvent: (event) => {
            if (event.type === "connected") {
              setConnected(true);
              if (!joinedRef.current) {
                joinedRef.current = true;
                guestTransportRef.current?.send({
                  type: "join",
                  playerId,
                  name: playerName,
                });
              }
              return;
            }

            if (event.type === "server_message") {
              applyMessage(event.message);
              return;
            }

            if (event.type === "disconnected") {
              setConnected(false);
              if (event.reason === "host_closed") {
                setConnectionError("Host disconnected.");
              } else if (event.reason === "heartbeat_timeout") {
                setConnectionError("Lost connection to host.");
              } else if (event.reason === "connection_error") {
                setConnectionError((current) =>
                  nextTransportConnectionError(current, "socket_error"),
                );
              }
            }
          },
        },
      );

      if (!transport) {
        setConnectionError("Local mode is unavailable.");
        return;
      }
      guestTransportRef.current = transport;
    }

    return () => {
      cambioFlashRef.current = null;
      viewRef.current = null;
      devBridgeCleanup?.();
      hostSessionRef.current?.close();
      hostSessionRef.current = null;
      guestTransportRef.current?.close();
      guestTransportRef.current = null;
      setConnected(false);
    };
  }, [roomId, playerName, applyMessage, enabled]);

  if (!enabled) {
    return idleP2PState;
  }

  return {
    connected,
    ...messageState,
    error: messageState.error ?? connectionError,
    send,
  };
}

export type UseP2PConnectionReturn = ReturnType<typeof useP2PConnection>;
