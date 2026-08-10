import { describe, expect, it } from "vitest";
import { isAbilitySwapFlash, isHandTakeFlash } from "./swap-flash";

describe("swap flash classification", () => {
  it("treats single-slot flash as hand take, not ability", () => {
    const slots = [{ playerId: "alice", slot: 1 }];
    expect(isHandTakeFlash(slots)).toBe(true);
    expect(isAbilitySwapFlash(slots)).toBe(false);
  });

  it("treats two-slot flash as ability swap", () => {
    const slots = [
      { playerId: "alice", slot: 0 },
      { playerId: "bob", slot: 2 },
    ];
    expect(isAbilitySwapFlash(slots)).toBe(true);
    expect(isHandTakeFlash(slots)).toBe(false);
  });

  it("treats same-player two-slot flash as ability swap", () => {
    const slots = [
      { playerId: "alice", slot: 0 },
      { playerId: "alice", slot: 3 },
    ];
    expect(isAbilitySwapFlash(slots)).toBe(true);
    expect(isHandTakeFlash(slots)).toBe(false);
  });
});
