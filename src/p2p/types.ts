import type { ClientMessage, ServerMessage } from "@cambio/game";

export const DEFAULT_LAN_PORT = 9876;
export const DEFAULT_HEARTBEAT_INTERVAL_MS = 3000;
export const DEFAULT_HEARTBEAT_TIMEOUT_MS = 5000;
export const MIN_HEARTBEAT_INTERVAL_MS = 3000;
export const MAX_HEARTBEAT_INTERVAL_MS = 5000;

export type TransportMode = "online" | "local";

export type LanSessionConfig = {
  mode: TransportMode;
  roomId: string;
  hostIp: string;
  port?: number;
  heartbeatIntervalMs?: number;
  heartbeatTimeoutMs?: number;
};

export type LanDisconnectReason =
  | "client_closed"
  | "connection_error"
  | "heartbeat_timeout"
  | "host_closed"
  | "invalid_payload"
  | "socket_closed";

export type LanTransportEvent =
  | { type: "connected"; role: "host" | "guest"; clientId?: string }
  | { type: "server_message"; message: ServerMessage }
  | { type: "client_message"; clientId: string; message: ClientMessage }
  | {
      type: "disconnected";
      role: "host" | "guest";
      reason: LanDisconnectReason;
      clientId?: string;
      detail?: string;
    };

export type LanTransportEventHandler = (event: LanTransportEvent) => void;
