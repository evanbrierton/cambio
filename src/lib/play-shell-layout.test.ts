import { describe, expect, it } from "vitest";
import { shouldFillPlayShellChin } from "./play-shell-layout";

describe("shouldFillPlayShellChin", () => {
  it("keeps safe-area padding for 4 or fewer grid seats", () => {
    expect(
      shouldFillPlayShellChin({
        pageScrollable: false,
        playerGridEnabled: true,
        seatCount: 4,
      }),
    ).toBe(false);
    expect(
      shouldFillPlayShellChin({
        pageScrollable: false,
        playerGridEnabled: true,
        seatCount: 2,
      }),
    ).toBe(false);
  });

  it("fills the chin for 5+ grid seats when the page is locked", () => {
    expect(
      shouldFillPlayShellChin({
        pageScrollable: false,
        playerGridEnabled: true,
        seatCount: 5,
      }),
    ).toBe(true);
    expect(
      shouldFillPlayShellChin({
        pageScrollable: false,
        playerGridEnabled: true,
        seatCount: 8,
      }),
    ).toBe(true);
  });

  it("never fills the chin in carousel view or scrollable phases", () => {
    expect(
      shouldFillPlayShellChin({
        pageScrollable: false,
        playerGridEnabled: false,
        seatCount: 8,
      }),
    ).toBe(false);
    expect(
      shouldFillPlayShellChin({
        pageScrollable: true,
        playerGridEnabled: true,
        seatCount: 8,
      }),
    ).toBe(false);
  });
});
