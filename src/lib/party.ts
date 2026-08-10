import process from "node:process";

const PARTYKIT_PORT = 8787;

export const DEFAULT_PARTY_HOST = "cambio.brierton.workers.dev";

const PRIVATE_10_HOSTNAME = /^10(?:\.\d+){3}$/;
const PRIVATE_192_168_HOSTNAME = /^192\.168(?:\.\d+){2}$/;
const PRIVATE_172_HOSTNAME = /^172\.(1[6-9]|2\d|3[0-1])(?:\.\d+){2}$/;

function isLocalHostname(hostname: string): boolean {
  if (
    hostname === "localhost" ||
    hostname === "127.0.0.1" ||
    hostname === "[::1]" ||
    hostname === "0.0.0.0"
  ) {
    return true;
  }

  if (PRIVATE_10_HOSTNAME.test(hostname)) {
    return true;
  }
  if (PRIVATE_192_168_HOSTNAME.test(hostname)) {
    return true;
  }
  if (PRIVATE_172_HOSTNAME.test(hostname)) {
    return true;
  }

  return false;
}

export function getPartyHost(): string {
  if (process.env.NEXT_PUBLIC_PARTYKIT_HOST) {
    return process.env.NEXT_PUBLIC_PARTYKIT_HOST;
  }

  if (
    "location" in globalThis &&
    globalThis.location &&
    isLocalHostname(globalThis.location.hostname)
  ) {
    return `${globalThis.location.hostname}:${PARTYKIT_PORT}`;
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
