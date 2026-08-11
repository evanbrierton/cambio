export const TUTORIAL_HOME_SEEN_KEY = "cambio-tutorial-home-seen";
export const TUTORIAL_GAME_SEEN_KEY = "cambio-tutorial-game-seen";

const SEEN = "1";
const UNSEEN = "0";

function readFlag(key: string): boolean {
  if (typeof window === "undefined") return false;

  try {
    return localStorage.getItem(key) === SEEN;
  } catch {
    return false;
  }
}

function writeFlag(key: string, seen: boolean): void {
  if (typeof window === "undefined") return;

  try {
    localStorage.setItem(key, seen ? SEEN : UNSEEN);
  } catch {
    // Ignore quota / private-mode failures.
  }
}

export function isHomeTutorialSeen(): boolean {
  return readFlag(TUTORIAL_HOME_SEEN_KEY);
}

export function isGameTutorialSeen(): boolean {
  return readFlag(TUTORIAL_GAME_SEEN_KEY);
}

export function markHomeTutorialSeen(): void {
  writeFlag(TUTORIAL_HOME_SEEN_KEY, true);
}

export function markGameTutorialSeen(): void {
  writeFlag(TUTORIAL_GAME_SEEN_KEY, true);
}

export function resetHomeTutorialSeen(): void {
  writeFlag(TUTORIAL_HOME_SEEN_KEY, false);
}

export function resetGameTutorialSeen(): void {
  writeFlag(TUTORIAL_GAME_SEEN_KEY, false);
}

export function resetAllTutorialSeen(): void {
  resetHomeTutorialSeen();
  resetGameTutorialSeen();
}
