import { describe, expect, it } from "vitest";
import {
  type CoachHintId,
  type CoachMoment,
  coachHintForClientMessage,
  nextCoachHint,
} from "./coach-moments";

const playing: CoachMoment = {
  phase: "playing",
  canDraw: false,
  canSnap: false,
  canCallCambio: false,
  hasDiscard: false,
};

function hint(
  moment: Partial<CoachMoment>,
  dismissed: CoachHintId[] = [],
): CoachHintId | null {
  return nextCoachHint({ ...playing, ...moment }, new Set(dismissed));
}

describe("nextCoachHint", () => {
  it("shows the hand only during setup peek", () => {
    expect(hint({ phase: "setup_peek" })).toBe("own-hand");
    expect(hint({ phase: "playing" })).toBeNull();
  });

  it("does not show Call Cambio during setup even if other flags leak", () => {
    expect(
      hint({
        phase: "setup_peek",
        canCallCambio: true,
        canDraw: true,
        hasDiscard: true,
      }),
    ).toBe("own-hand");
  });

  it("shows the deck when the player can draw", () => {
    expect(hint({ canDraw: true })).toBe("deck");
  });

  it("does not show Call Cambio while the draw hint is still pending", () => {
    expect(hint({ canDraw: true, canCallCambio: true })).toBe("deck");
  });

  it("shows Call Cambio only when that action is available", () => {
    expect(
      hint({ canCallCambio: false }, ["own-hand", "deck", "discard"]),
    ).toBe(null);
    expect(hint({ canCallCambio: true }, ["own-hand", "deck", "discard"])).toBe(
      "call-cambio",
    );
  });

  it("shows discard after setup when the pile has a card or snap is live", () => {
    expect(hint({ hasDiscard: true }, ["own-hand", "deck"])).toBe("discard");
    expect(hint({ canSnap: true }, ["own-hand", "deck"])).toBe("discard");
    expect(
      hint({ phase: "setup_peek", hasDiscard: true }, ["own-hand"]),
    ).toBeNull();
  });

  it("returns null in lobby and ended phases", () => {
    expect(hint({ phase: "lobby", canCallCambio: true })).toBeNull();
    expect(hint({ phase: "ended", canCallCambio: true })).toBeNull();
  });

  it("returns null once every hint is dismissed", () => {
    expect(
      hint(
        { canDraw: true, canCallCambio: true, canSnap: true, hasDiscard: true },
        ["own-hand", "deck", "discard", "call-cambio"],
      ),
    ).toBeNull();
  });
});

describe("coachHintForClientMessage", () => {
  it("completes the matching hint when the player takes that action", () => {
    expect(coachHintForClientMessage({ type: "setup_peek", slot: 2 })).toBe(
      "own-hand",
    );
    expect(coachHintForClientMessage({ type: "draw", source: "deck" })).toBe(
      "deck",
    );
    expect(coachHintForClientMessage({ type: "draw", source: "discard" })).toBe(
      "discard",
    );
    expect(
      coachHintForClientMessage({
        type: "snap",
        targetPlayerId: "p1",
        slot: 0,
      }),
    ).toBe("discard");
    expect(coachHintForClientMessage({ type: "call_cambio" })).toBe(
      "call-cambio",
    );
  });

  it("ignores unrelated messages", () => {
    expect(coachHintForClientMessage({ type: "start_game" })).toBeNull();
    expect(coachHintForClientMessage({ type: "swap", slot: 0 })).toBeNull();
  });

  it("does not repeat the deck hint after drawing from the deck", () => {
    const completed = coachHintForClientMessage({
      type: "draw",
      source: "deck",
    });
    expect(completed).toBe("deck");
    expect(hint({ canDraw: true, hasDiscard: true }, ["deck"])).not.toBe(
      "deck",
    );
  });
});
