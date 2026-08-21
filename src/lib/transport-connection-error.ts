export const GAME_SERVER_CONNECT_ERROR = "Could not connect to game server.";

export type TransportConnectionErrorEvent =
  | "socket_error"
  | "socket_open"
  | "server_ack";

export function nextTransportConnectionError(
  current: string | null,
  event: TransportConnectionErrorEvent,
): string | null {
  if (event === "server_ack") return null;
  if (event === "socket_open") return current;
  return current ?? GAME_SERVER_CONNECT_ERROR;
}
