const GRID_STORAGE_KEY = "cambio-player-grid-enabled";
const OWN_SEAT_STORAGE_KEY = "cambio-own-seat-display";

export type OwnSeatDisplay = "prominent" | "turn-order";

export function isPlayerGridEnabled(): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(GRID_STORAGE_KEY) === "1";
}

export function setPlayerGridEnabled(enabled: boolean): void {
  localStorage.setItem(GRID_STORAGE_KEY, enabled ? "1" : "0");
}

/** Default: prominent — keep your seat centered / first for easier play. */
export function getOwnSeatDisplay(): OwnSeatDisplay {
  if (typeof window === "undefined") return "prominent";
  return localStorage.getItem(OWN_SEAT_STORAGE_KEY) === "turn-order"
    ? "turn-order"
    : "prominent";
}

export function setOwnSeatDisplay(mode: OwnSeatDisplay): void {
  localStorage.setItem(OWN_SEAT_STORAGE_KEY, mode);
}

export function isOwnSeatProminent(): boolean {
  return getOwnSeatDisplay() === "prominent";
}
