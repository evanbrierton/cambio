export const TUTORIAL_HOME_SEEN_KEY = "cambio-tutorial-home-seen";
export const TUTORIAL_GAME_SEEN_KEY = "cambio-tutorial-game-seen";

const SEEN = "1";
const UNSEEN = "0";

export const TUTORIAL_STAGE = {
  LANDING_MODAL: "landing-modal",
  IN_GAME_COACH: "in-game-coach",
} as const;

export type TutorialStage = (typeof TUTORIAL_STAGE)[keyof typeof TUTORIAL_STAGE];

export const TUTORIAL_DISMISS_REASON = {
  SKIP: "skip",
  FINISH: "finish",
  ESCAPE: "escape",
  TOUCH_DISMISS: "touch-dismiss",
} as const;

export type TutorialDismissReason =
  (typeof TUTORIAL_DISMISS_REASON)[keyof typeof TUTORIAL_DISMISS_REASON];

export type TutorialSeenFlags = {
  homeSeen: boolean;
  gameSeen: boolean;
};

export function markStageSeenOnDismiss(
  current: TutorialSeenFlags,
  stage: TutorialStage,
  reason: TutorialDismissReason,
): TutorialSeenFlags {
  switch (reason) {
    case TUTORIAL_DISMISS_REASON.SKIP:
    case TUTORIAL_DISMISS_REASON.FINISH:
    case TUTORIAL_DISMISS_REASON.ESCAPE:
    case TUTORIAL_DISMISS_REASON.TOUCH_DISMISS:
      return stage === TUTORIAL_STAGE.LANDING_MODAL
        ? { ...current, homeSeen: true }
        : { ...current, gameSeen: true };
    default:
      return current;
  }
}

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
