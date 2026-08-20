import type { GamePhase } from "@/game/types";

export const COACH_HINT_IDS = [
  "own-hand",
  "deck",
  "discard",
  "call-cambio",
] as const;

export type CoachHintId = (typeof COACH_HINT_IDS)[number];

export type CoachMoment = {
  phase: GamePhase | string;
  canDraw: boolean;
  canSnap: boolean;
  canCallCambio: boolean;
  hasDiscard: boolean;
};

export function isCoachEligiblePhase(phase: string): boolean {
  return (
    phase !== "lobby" &&
    phase !== "ended" &&
    phase !== "revealed" &&
    phase !== "waiting"
  );
}

/**
 * Next spotlight to show for this game state. Hints stay hidden until the
 * matching action is actually available (e.g. Call Cambio only when
 * `canCallCambio`), in CAM-67 order: setup peek → draw → snap → call.
 */
export function nextCoachHint(
  moment: CoachMoment,
  dismissed: ReadonlySet<CoachHintId>,
): CoachHintId | null {
  if (!isCoachEligiblePhase(moment.phase)) {
    return null;
  }

  if (!dismissed.has("own-hand") && moment.phase === "setup_peek") {
    return "own-hand";
  }

  if (!dismissed.has("deck") && moment.canDraw) {
    return "deck";
  }

  if (
    !dismissed.has("discard") &&
    moment.phase !== "setup_peek" &&
    (moment.canSnap || moment.hasDiscard)
  ) {
    return "discard";
  }

  if (!dismissed.has("call-cambio") && moment.canCallCambio) {
    return "call-cambio";
  }

  return null;
}
