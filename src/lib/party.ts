export function getPartyHost(): string {
  if (typeof window !== "undefined") {
    return process.env.NEXT_PUBLIC_PARTYKIT_HOST ?? "127.0.0.1:1999";
  }
  return process.env.NEXT_PUBLIC_PARTYKIT_HOST ?? "127.0.0.1:1999";
}

export function storageKey(roomId: string): string {
  return `cambio-player-${roomId}`;
}

export function freshSessionKey(roomId: string): string {
  return `cambio-fresh-${roomId}`;
}

export const PLAYER_NAME_KEY = "cambio-player-name";
