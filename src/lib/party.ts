const PARTYKIT_PORT = 8787;

export function getPartyHost(): string {
  if (process.env.NEXT_PUBLIC_PARTYKIT_HOST) {
    return process.env.NEXT_PUBLIC_PARTYKIT_HOST;
  }

  if (typeof window !== "undefined") {
    return `${window.location.hostname}:${PARTYKIT_PORT}`;
  }

  return `127.0.0.1:${PARTYKIT_PORT}`;
}

export function storageKey(roomId: string): string {
  return `cambio-player-${roomId}`;
}

export function freshSessionKey(roomId: string): string {
  return `cambio-fresh-${roomId}`;
}

export const PLAYER_NAME_KEY = "cambio-player-name";
