import type { ClientMessage, ServerMessage } from "@cambio/game";
import {
  parseClientMessage,
  parseClientMessageJson,
  parseServerMessage,
  parseServerMessageJson,
} from "@cambio/game/wire-schema";
import {
  DEFAULT_HEARTBEAT_INTERVAL_MS,
  DEFAULT_HEARTBEAT_TIMEOUT_MS,
  DEFAULT_LAN_PORT,
  type LanDisconnectReason,
  type LanSessionConfig,
  type LanTransportEventHandler,
  MAX_HEARTBEAT_INTERVAL_MS,
  MIN_HEARTBEAT_INTERVAL_MS,
} from "./types";

const READY_STATE_OPEN = 1;
const CLOSE_CODE_GOING_AWAY = 1001;
const CLOSE_CODE_POLICY_VIOLATION = 1008;
const CLOSE_CODE_SERVICE_RESTART = 1012;

type SocketEventName = "open" | "close" | "error" | "message";
type SocketEventListener = (event: { data?: unknown }) => void;

export interface LanSocketLike {
  readonly readyState: number;
  send(data: string): void;
  close(code?: number, reason?: string): void;
  addEventListener(type: SocketEventName, listener: SocketEventListener): void;
  removeEventListener(
    type: SocketEventName,
    listener: SocketEventListener,
  ): void;
}

export type LanWebSocketFactory = (url: string) => LanSocketLike;

type ResolvedLanSessionConfig = {
  mode: LanSessionConfig["mode"];
  roomId: string;
  hostIp: string;
  port: number;
  heartbeatIntervalMs: number;
  heartbeatTimeoutMs: number;
};

type LanWireFrame =
  | { kind: "client"; message: ClientMessage }
  | { kind: "server"; message: ServerMessage }
  | { kind: "ping" }
  | { kind: "pong" }
  | { kind: "host_closing" };

type SocketListenerSet = {
  open: SocketEventListener;
  close: SocketEventListener;
  error: SocketEventListener;
  message: SocketEventListener;
};

export type LanHostRelayOptions = {
  onEvent?: LanTransportEventHandler;
};

export type LanGuestTransportOptions = {
  onEvent?: LanTransportEventHandler;
  webSocketFactory?: LanWebSocketFactory;
};

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function getErrorDetail(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function parseWireFrame(raw: string): LanWireFrame | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }

  if (!parsed || typeof parsed !== "object") return null;
  const maybeFrame = parsed as { kind?: unknown; message?: unknown };
  if (typeof maybeFrame.kind !== "string") return null;

  if (maybeFrame.kind === "client") {
    const message = parseClientMessage(maybeFrame.message);
    return message ? { kind: "client", message } : null;
  }

  if (maybeFrame.kind === "server") {
    const message = parseServerMessage(maybeFrame.message);
    return message ? { kind: "server", message } : null;
  }

  if (
    maybeFrame.kind === "ping" ||
    maybeFrame.kind === "pong" ||
    maybeFrame.kind === "host_closing"
  ) {
    return { kind: maybeFrame.kind };
  }

  return null;
}

function serializeWireFrame(frame: LanWireFrame): string {
  return JSON.stringify(frame);
}

function resolveConfig(config: LanSessionConfig): ResolvedLanSessionConfig {
  return {
    mode: config.mode,
    roomId: config.roomId,
    hostIp: config.hostIp,
    port: config.port ?? DEFAULT_LAN_PORT,
    heartbeatIntervalMs: clamp(
      config.heartbeatIntervalMs ?? DEFAULT_HEARTBEAT_INTERVAL_MS,
      MIN_HEARTBEAT_INTERVAL_MS,
      MAX_HEARTBEAT_INTERVAL_MS,
    ),
    heartbeatTimeoutMs: clamp(
      config.heartbeatTimeoutMs ?? DEFAULT_HEARTBEAT_TIMEOUT_MS,
      1000,
      DEFAULT_HEARTBEAT_TIMEOUT_MS,
    ),
  };
}

function defaultWebSocketFactory(url: string): LanSocketLike {
  const WebSocketCtor = globalThis.WebSocket;
  if (!WebSocketCtor) {
    throw new Error("WebSocket is unavailable in this runtime.");
  }
  return new WebSocketCtor(url) as unknown as LanSocketLike;
}

function closeSocketSafely(
  socket: LanSocketLike,
  code: number,
  reason: string,
): void {
  try {
    socket.close(code, reason);
  } catch (error) {
    void error;
  }
}

function removeSocketListeners(
  socket: LanSocketLike,
  listeners: SocketListenerSet,
): void {
  socket.removeEventListener("open", listeners.open);
  socket.removeEventListener("close", listeners.close);
  socket.removeEventListener("error", listeners.error);
  socket.removeEventListener("message", listeners.message);
}

type GuestConnection = {
  socket: LanSocketLike;
  listeners: SocketListenerSet;
};

export function buildLanRoomUrl(config: {
  hostIp: string;
  roomId: string;
  port?: number;
}): string {
  const port = config.port ?? DEFAULT_LAN_PORT;
  const roomId = encodeURIComponent(config.roomId);
  return `ws://${config.hostIp}:${port}/room/${roomId}`;
}

export function serializeClientMessage(message: ClientMessage): string {
  return JSON.stringify(message);
}

export function deserializeClientMessage(raw: string): ClientMessage | null {
  return parseClientMessageJson(raw);
}

export function serializeServerMessage(message: ServerMessage): string {
  return JSON.stringify(message);
}

export function deserializeServerMessage(raw: string): ServerMessage | null {
  return parseServerMessageJson(raw);
}

export class LanHostRelay {
  private readonly config: ResolvedLanSessionConfig;
  private readonly onEvent?: LanTransportEventHandler;
  private readonly guests = new Map<string, GuestConnection>();
  private clientCount = 0;
  private closed = false;
  private beforeUnloadListener: (() => void) | null = null;

  constructor(config: LanSessionConfig, options: LanHostRelayOptions = {}) {
    this.config = resolveConfig(config);
    this.onEvent = options.onEvent;
    if (typeof window !== "undefined") {
      this.beforeUnloadListener = () => {
        this.close();
      };
      window.addEventListener("beforeunload", this.beforeUnloadListener);
    }
  }

  registerGuestSocket(socket: LanSocketLike, clientId?: string): string {
    if (this.closed) {
      closeSocketSafely(socket, CLOSE_CODE_SERVICE_RESTART, "host_closed");
      return clientId ?? `guest-${this.clientCount + 1}`;
    }

    const resolvedClientId = clientId ?? `guest-${++this.clientCount}`;
    const onOpen: SocketEventListener = () => {};
    const onClose: SocketEventListener = () => {
      this.removeGuest(resolvedClientId, "socket_closed");
    };
    const onError: SocketEventListener = () => {
      this.removeGuest(resolvedClientId, "socket_closed");
    };
    const onMessage: SocketEventListener = (event) => {
      const rawData = event.data;
      if (typeof rawData !== "string") {
        this.removeGuest(resolvedClientId, "invalid_payload");
        return;
      }

      const frame = parseWireFrame(rawData);
      if (!frame) {
        this.removeGuest(resolvedClientId, "invalid_payload");
        return;
      }

      if (frame.kind === "client") {
        this.onEvent?.({
          type: "client_message",
          clientId: resolvedClientId,
          message: frame.message,
        });
        return;
      }

      if (frame.kind === "ping") {
        this.sendToGuest(resolvedClientId, { kind: "pong" });
        return;
      }

      if (frame.kind === "pong") {
        return;
      }

      this.removeGuest(resolvedClientId, "invalid_payload");
    };

    const listeners: SocketListenerSet = {
      open: onOpen,
      close: onClose,
      error: onError,
      message: onMessage,
    };

    socket.addEventListener("open", listeners.open);
    socket.addEventListener("close", listeners.close);
    socket.addEventListener("error", listeners.error);
    socket.addEventListener("message", listeners.message);

    this.guests.set(resolvedClientId, { socket, listeners });
    this.onEvent?.({
      type: "connected",
      role: "host",
      clientId: resolvedClientId,
    });
    return resolvedClientId;
  }

  broadcast(message: ServerMessage): void {
    if (this.closed) return;
    const payload = serializeWireFrame({ kind: "server", message });
    for (const [clientId, connection] of this.guests.entries()) {
      if (connection.socket.readyState !== READY_STATE_OPEN) {
        this.removeGuest(clientId, "socket_closed");
        continue;
      }
      connection.socket.send(payload);
    }
  }

  sendToClient(clientId: string, message: ServerMessage): void {
    if (this.closed) return;
    this.sendToGuest(clientId, { kind: "server", message });
  }

  close(): void {
    if (this.closed) return;
    this.closed = true;
    if (this.beforeUnloadListener && typeof window !== "undefined") {
      window.removeEventListener("beforeunload", this.beforeUnloadListener);
      this.beforeUnloadListener = null;
    }

    for (const [clientId, connection] of this.guests.entries()) {
      removeSocketListeners(connection.socket, connection.listeners);
      if (connection.socket.readyState === READY_STATE_OPEN) {
        connection.socket.send(serializeWireFrame({ kind: "host_closing" }));
      }
      closeSocketSafely(
        connection.socket,
        CLOSE_CODE_SERVICE_RESTART,
        "host_closed",
      );
      this.guests.delete(clientId);
      this.onEvent?.({
        type: "disconnected",
        role: "host",
        reason: "host_closed",
        clientId,
      });
    }

    this.onEvent?.({
      type: "disconnected",
      role: "host",
      reason: "host_closed",
    });
  }

  private removeGuest(
    clientId: string,
    reason: LanDisconnectReason,
    detail?: string,
  ): void {
    const connection = this.guests.get(clientId);
    if (!connection) return;
    removeSocketListeners(connection.socket, connection.listeners);
    this.guests.delete(clientId);

    if (connection.socket.readyState === READY_STATE_OPEN) {
      const closeReason =
        reason === "invalid_payload" ? "invalid_payload" : "socket_closed";
      const closeCode =
        reason === "invalid_payload"
          ? CLOSE_CODE_POLICY_VIOLATION
          : CLOSE_CODE_GOING_AWAY;
      closeSocketSafely(connection.socket, closeCode, closeReason);
    }

    this.onEvent?.({
      type: "disconnected",
      role: "host",
      reason,
      clientId,
      detail,
    });
  }

  private sendToGuest(clientId: string, frame: LanWireFrame): void {
    const connection = this.guests.get(clientId);
    if (!connection) return;
    if (connection.socket.readyState !== READY_STATE_OPEN) return;
    connection.socket.send(serializeWireFrame(frame));
  }

  get roomId(): string {
    return this.config.roomId;
  }
}

export class LanGuestTransport {
  readonly url: string;

  private readonly config: ResolvedLanSessionConfig;
  private readonly onEvent?: LanTransportEventHandler;
  private readonly webSocketFactory: LanWebSocketFactory;

  private socket: LanSocketLike | null = null;
  private listeners: SocketListenerSet | null = null;
  private heartbeatIntervalTimer: ReturnType<typeof setInterval> | null = null;
  private heartbeatDeadlineTimer: ReturnType<typeof setTimeout> | null = null;
  private awaitingPong = false;
  private disconnected = false;
  private hostClosed = false;

  constructor(
    config: LanSessionConfig,
    options: LanGuestTransportOptions = {},
  ) {
    this.config = resolveConfig(config);
    this.onEvent = options.onEvent;
    this.webSocketFactory = options.webSocketFactory ?? defaultWebSocketFactory;
    this.url = buildLanRoomUrl(this.config);
  }

  connect(): void {
    if (this.disconnected || this.socket) return;
    let socket: LanSocketLike;
    try {
      socket = this.webSocketFactory(this.url);
    } catch (error) {
      this.disconnectWithReason("connection_error", getErrorDetail(error));
      return;
    }

    const onOpen: SocketEventListener = () => {
      this.onEvent?.({ type: "connected", role: "guest" });
      this.startHeartbeat();
    };
    const onClose: SocketEventListener = () => {
      const reason: LanDisconnectReason = this.hostClosed
        ? "host_closed"
        : "socket_closed";
      this.disconnectWithReason(reason);
    };
    const onError: SocketEventListener = () => {
      this.disconnectWithReason("connection_error");
    };
    const onMessage: SocketEventListener = (event) => {
      const rawData = event.data;
      if (typeof rawData !== "string") {
        this.disconnectWithReason("invalid_payload");
        return;
      }

      const frame = parseWireFrame(rawData);
      if (!frame) {
        this.disconnectWithReason("invalid_payload");
        return;
      }

      if (frame.kind === "server") {
        this.onEvent?.({ type: "server_message", message: frame.message });
        return;
      }

      if (frame.kind === "ping") {
        this.sendFrame({ kind: "pong" });
        return;
      }

      if (frame.kind === "pong") {
        this.awaitingPong = false;
        this.clearHeartbeatDeadline();
        return;
      }

      if (frame.kind === "host_closing") {
        this.hostClosed = true;
        this.disconnectWithReason("host_closed");
        return;
      }

      this.disconnectWithReason("invalid_payload");
    };

    const listeners: SocketListenerSet = {
      open: onOpen,
      close: onClose,
      error: onError,
      message: onMessage,
    };

    socket.addEventListener("open", listeners.open);
    socket.addEventListener("close", listeners.close);
    socket.addEventListener("error", listeners.error);
    socket.addEventListener("message", listeners.message);

    this.socket = socket;
    this.listeners = listeners;
  }

  send(message: ClientMessage): boolean {
    if (!this.socket || this.socket.readyState !== READY_STATE_OPEN)
      return false;
    this.sendFrame({ kind: "client", message });
    return true;
  }

  close(): void {
    this.disconnectWithReason("client_closed");
  }

  private sendFrame(frame: LanWireFrame): void {
    if (!this.socket || this.socket.readyState !== READY_STATE_OPEN) return;
    this.socket.send(serializeWireFrame(frame));
  }

  private startHeartbeat(): void {
    this.stopHeartbeat();
    this.sendHeartbeatPing();
    this.heartbeatIntervalTimer = setInterval(() => {
      this.sendHeartbeatPing();
    }, this.config.heartbeatIntervalMs);
  }

  private stopHeartbeat(): void {
    if (this.heartbeatIntervalTimer) {
      clearInterval(this.heartbeatIntervalTimer);
      this.heartbeatIntervalTimer = null;
    }
    this.clearHeartbeatDeadline();
  }

  private sendHeartbeatPing(): void {
    if (!this.socket || this.socket.readyState !== READY_STATE_OPEN) return;
    if (!this.awaitingPong) {
      this.awaitingPong = true;
      this.clearHeartbeatDeadline();
      this.heartbeatDeadlineTimer = setTimeout(() => {
        this.disconnectWithReason("heartbeat_timeout");
      }, this.config.heartbeatTimeoutMs);
    }
    this.sendFrame({ kind: "ping" });
  }

  private clearHeartbeatDeadline(): void {
    if (!this.heartbeatDeadlineTimer) return;
    clearTimeout(this.heartbeatDeadlineTimer);
    this.heartbeatDeadlineTimer = null;
  }

  private disconnectWithReason(
    reason: LanDisconnectReason,
    detail?: string,
  ): void {
    if (this.disconnected) return;
    this.disconnected = true;
    this.awaitingPong = false;
    this.stopHeartbeat();

    if (this.socket && this.listeners) {
      removeSocketListeners(this.socket, this.listeners);
    }
    const socket = this.socket;
    this.socket = null;
    this.listeners = null;

    if (socket && socket.readyState === READY_STATE_OPEN) {
      const closeCode =
        reason === "invalid_payload"
          ? CLOSE_CODE_POLICY_VIOLATION
          : reason === "host_closed"
            ? CLOSE_CODE_SERVICE_RESTART
            : CLOSE_CODE_GOING_AWAY;
      closeSocketSafely(socket, closeCode, reason);
    }

    this.onEvent?.({
      type: "disconnected",
      role: "guest",
      reason,
      detail,
    });
  }
}

export function createLanHostRelay(
  config: LanSessionConfig,
  options?: LanHostRelayOptions,
): LanHostRelay | null {
  if (config.mode !== "local") return null;
  return new LanHostRelay(config, options);
}

export function createLanGuestTransport(
  config: LanSessionConfig,
  options?: LanGuestTransportOptions,
): LanGuestTransport | null {
  if (config.mode !== "local") return null;
  const transport = new LanGuestTransport(config, options);
  transport.connect();
  return transport;
}
