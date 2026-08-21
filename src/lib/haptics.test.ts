import type { HapticKind } from "@cambio/client";
import { describe, expect, it } from "vitest";
import { hapticKindForSound } from "./haptics";
import type { SoundId } from "./sounds";

const EVENT_HAPTICS: Array<[SoundId, HapticKind]> = [
  ["snapWrong", "error"],
  ["yourTurn", "medium"],
  ["gameOver", "success"],
  ["swap", "medium"],
  ["snapWindowStart", "warning"],
  ["peek", "light"],
  ["spy", "light"],
  ["flip", "light"],
  ["take", "light"],
  ["reshuffle", "light"],
];

const TAP_OR_NOISY: SoundId[] = [
  "snap",
  "cambio",
  "deckDraw",
  "discardDraw",
  "snapCountdown",
  "click",
  "chat",
];

describe("hapticKindForSound", () => {
  it("maps ambient game events to haptic kinds", () => {
    for (const [id, kind] of EVENT_HAPTICS) {
      expect(hapticKindForSound(id)).toBe(kind);
    }
  });

  it("skips tap-owned or noisy sounds so they do not double-fire", () => {
    for (const id of TAP_OR_NOISY) {
      expect(hapticKindForSound(id)).toBeNull();
    }
  });
});
