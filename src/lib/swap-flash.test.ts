import { describe, expect, it } from "vitest";
import { isAbilitySwapFlash } from "./swap-flash";

describe("isAbilitySwapFlash", () => {
  it("returns false for drawn-card hand swap (single slot)", () => {
    expect(isAbilitySwapFlash([{ playerId: "alice", slot: 1 }])).toBe(false);
  });

  it("returns true for ability swap (two slots)", () => {
    expect(
      isAbilitySwapFlash([
        { playerId: "alice", slot: 0 },
        { playerId: "bob", slot: 2 },
      ]),
    ).toBe(true);
  });

  it("returns true for same-player ability swap (two slots)", () => {
    expect(
      isAbilitySwapFlash([
        { playerId: "alice", slot: 0 },
        { playerId: "alice", slot: 3 },
      ]),
    ).toBe(true);
  });
});
