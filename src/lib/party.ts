const PARTYKIT_PORT = 8787;

export const DEFAULT_PARTY_HOST = "cambio.brierton.workers.dev";

function isLocalHostname(hostname: string): boolean {
  if (
    hostname === "localhost" ||
    hostname === "127.0.0.1" ||
    hostname === "[::1]" ||
    hostname === "0.0.0.0"
  ) {
    return true;
  }

  if (/^10(?:\.\d+){3}$/.test(hostname)) return true;
  if (/^192\.168(?:\.\d+){2}$/.test(hostname)) return true;
  if (/^172\.(1[6-9]|2\d|3[0-1])(?:\.\d+){2}$/.test(hostname)) return true;

  return false;
}

export function getPartyHost(): string {
  if (process.env.NEXT_PUBLIC_PARTYKIT_HOST) {
    return process.env.NEXT_PUBLIC_PARTYKIT_HOST;
  }

  if (
    typeof window !== "undefined" &&
    isLocalHostname(window.location.hostname)
  ) {
    return `${window.location.hostname}:${PARTYKIT_PORT}`;
  }

  return DEFAULT_PARTY_HOST;
}

export function storageKey(roomId: string): string {
  return `cambio-player-${roomId}`;
}

export function freshSessionKey(roomId: string): string {
  return `cambio-fresh-${roomId}`;
}

export const PLAYER_NAME_KEY = "cambio-player-name";
