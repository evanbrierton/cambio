"use client";

import { getDefaultPlatformAdapters } from "@cambio/client/platform";
import { nanoid } from "nanoid";
import { useCallback, useEffect, useRef, useState } from "react";
import { GameHost, type HostPeer } from "@/game/host";
import type { ClientMessage, PlayerView, ServerMessage } from "@/game/types";
import type { CambioFlash } from "@/hooks/useServerMessages";
import { useServerMessages } from "@/hooks/useServerMessages";
import { freshSessionKey, storageKey } from "@/lib/party";
import { nextTransportConnectionError } from "@/lib/transport-connection-error";
import {
  createLanGuestTransport,
  createLanHostRelay,
  type LanGuestTransport,
  type LanHostRelay,
} from "@/p2p/lan-transport";
import { DEFAULT_LAN_PORT } from "@/p2p/types";

export type P2PRole = "host" | "guest";

export type P2PConnectionOptions = {
  role: P2PRole;
  /** When false, the hook stays idle (online rooms). */
  enabled?: boolean;
  /** Required for guests: hostIp:port */
  endpoint?: string;
  seedBotCount?: number;
  difficulty?: "easy" | "medium" | "hard";
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

function parseEndpoint(endpoint: string): { hostIp: string; port: number } {
  const trimmed = endpoint.trim();
  const [hostIp, portRaw] = trimmed.split(":");
  const port = Number.parseInt(portRaw ?? String(DEFAULT_LAN_PORT), 10);
  return {
    hostIp: hostIp || "127.0.0.1",
    port: Number.isFinite(port) ? port : DEFAULT_LAN_PORT,
  };
}

/**
 * Nearby (LAN) connection using in-tab GameHost + CAM-22 transport.
 * Real multi-device still needs a WS acceptor or WebRTC; this wires the lobby path.
 */
export function useP2PConnection(
  roomId: string,
  playerName: string,
  options: P2PConnectionOptions,
) {
  const [connected, setConnected] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [lanEndpoint, setLanEndpoint] = useState<string | null>(null);
  const hostRef = useRef<GameHost | null>(null);
  const relayRef = useRef<LanHostRelay | null>(null);
  const guestRef = useRef<LanGuestTransport | null>(null);
  const localPeerIdRef = useRef(`local-${nanoid(6)}`);
  const hostPlayerIdRef = useRef<string | null>(null);
  const cambioFlashRef = useRef<CambioFlash | null>(null);
  const viewRef = useRef<PlayerView | null>(null);
  const wakeLockRef = useRef<WakeLockSentinel | null>(null);

  const roomKeyRef = useRef(storageKey(roomId));
  const seenKeyRef = useRef(freshSessionKey(roomId));
  const optionsRef = useRef(options);
  optionsRef.current = options;

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
      if (optionsRef.current.role === "host") {
        const host = hostRef.current;
        const playerId = hostPlayerIdRef.current;
        if (!host || !playerId) return;
        void host.dispatchMessage(playerId, message, (error) => {
          applyMessage({ type: "error", message: error });
        });
        return;
      }

      guestRef.current?.send(message);
    },
    [applyMessage],
  );

  useEffect(() => {
    roomKeyRef.current = storageKey(roomId);
    seenKeyRef.current = freshSessionKey(roomId);
    const enabled = optionsRef.current.enabled !== false;
    if (!enabled) {
      setConnected(false);
      return;
    }
    const playerId = resolvePlayerId(roomId);
    const role = optionsRef.current.role;
    let cancelled = false;

    const deliverLocal = (message: ServerMessage) => {
      if (cancelled) return;
      applyMessage(message);
    };

    if (role === "host") {
      const host = new GameHost({ roomId });
      hostRef.current = host;

      const localPeer: HostPeer = {
        playerId,
        connected: true,
        send: deliverLocal,
      };
      host.addPeer(localPeerIdRef.current, localPeer);

      const relay = createLanHostRelay(
        {
          mode: "local",
          roomId,
          hostIp: "0.0.0.0",
          port: DEFAULT_LAN_PORT,
        },
        {
          onEvent: (event) => {
            if (event.type === "client_message") {
              if (event.message.type === "join") {
                const joinMessage = event.message;
                void (async () => {
                  const result = await host.handleConnect({
                    queryPlayerId: joinMessage.playerId ?? event.clientId,
                    name: joinMessage.name,
                    network: "nearby",
                    visibility: "private",
                  });
                  const peer = host.getPeer(event.clientId);
                  if (peer && result.playerId) {
                    peer.playerId = result.playerId;
                  }
                  if (result.error) {
                    relay?.sendToClient(event.clientId, {
                      type: "error",
                      message: result.error,
                    });
                  }
                })();
                return;
              }
              const peer = host.getPeer(event.clientId);
              const playerId = peer?.playerId ?? event.clientId;
              void host.dispatchMessage(playerId, event.message, (error) => {
                relay?.sendToClient(event.clientId, {
                  type: "error",
                  message: error,
                });
              });
              return;
            }
            if (event.type === "connected" && event.clientId) {
              const peer: HostPeer = {
                playerId: event.clientId,
                connected: true,
                send: (message) => {
                  relay?.sendToClient(event.clientId!, message);
                },
              };
              host.addPeer(event.clientId, peer);
              return;
            }
            if (event.type === "disconnected" && event.clientId) {
              const peer = host.getPeer(event.clientId);
              const playerId = peer?.playerId ?? event.clientId;
              void host.handleDisconnect(playerId, event.clientId);
              host.removePeer(event.clientId);
            }
          },
        },
      );
      relayRef.current = relay;

      void (async () => {
        const result = await host.handleConnect({
          queryPlayerId: playerId,
          name: playerName,
          network: "nearby",
          visibility: "private",
          seedBotCount: optionsRef.current.seedBotCount ?? 0,
          difficulty: optionsRef.current.difficulty ?? "easy",
        });
        if (cancelled) return;
        if (result.error) {
          applyMessage({ type: "error", message: result.error });
          setConnected(false);
          return;
        }
        hostPlayerIdRef.current = result.playerId;
        localPeer.playerId = result.playerId;
        applyMessage({
          type: "room_info",
          roomId,
          playerId: result.playerId,
        });
        host.broadcastState();
        setConnected(true);
        setLanEndpoint(`your-lan-ip:${DEFAULT_LAN_PORT}`);

        try {
          if (navigator.wakeLock?.request) {
            wakeLockRef.current = await navigator.wakeLock.request("screen");
          }
        } catch {
          // Wake Lock is best-effort on nearby hosts.
        }
      })();
    } else {
      const endpoint = optionsRef.current.endpoint;
      if (!endpoint) {
        setConnectionError("Nearby join requires a host endpoint.");
        return;
      }
      const { hostIp, port } = parseEndpoint(endpoint);
      const guest = createLanGuestTransport(
        {
          mode: "local",
          roomId,
          hostIp,
          port,
        },
        {
          onEvent: (event) => {
            if (event.type === "connected") {
              setConnected(true);
              guest?.send({ type: "join", playerId, name: playerName });
              return;
            }
            if (event.type === "server_message") {
              applyMessage(event.message);
              return;
            }
            if (event.type === "disconnected") {
              setConnected(false);
              setConnectionError((current) =>
                nextTransportConnectionError(current, "socket_error"),
              );
            }
          },
        },
      );
      guestRef.current = guest;
      if (!guest) {
        setConnectionError("Nearby transport unavailable.");
      }
    }

    return () => {
      cancelled = true;
      wakeLockRef.current?.release().catch(() => {});
      wakeLockRef.current = null;
      relayRef.current?.close();
      relayRef.current = null;
      guestRef.current?.close();
      guestRef.current = null;
      hostRef.current = null;
      hostPlayerIdRef.current = null;
      setConnected(false);
    };
  }, [roomId, playerName, applyMessage]);

  return {
    connected,
    ...messageState,
    error: messageState.error ?? connectionError,
    send,
    lanEndpoint,
    role: options.role,
  };
}
