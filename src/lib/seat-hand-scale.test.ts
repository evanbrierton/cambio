import { describe, expect, it } from "vitest";
import {
  computeSeatHandSize,
  maxSeatCardWidthForViewport,
  SEAT_CARD_GAP_PX,
  SEAT_CARD_MIN_W,
} from "./seat-hand-scale";

describe("computeSeatHandSize", () => {
  it("keeps base 2-column hands at the viewport max when there is room", () => {
    const size = computeSeatHandSize(200, 2, 56);
    expect(size.cardW).toBe(56);
    expect(size.handW).toBe(56 * 2 + SEAT_CARD_GAP_PX);
  });

  it("shrinks cards so base + penalty columns fit the seat width", () => {
    // Narrow grid cell with one penalty column (3 card columns).
    const available = 120;
    const cols = 3;
    const size = computeSeatHandSize(available, cols, 56);
    const totalWidth = size.cardW * cols + SEAT_CARD_GAP_PX * (cols - 1);
    expect(totalWidth).toBeLessThanOrEqual(available + 0.01);
    expect(size.cardW).toBeLessThan(56);
    expect(size.cardW).toBeGreaterThanOrEqual(SEAT_CARD_MIN_W);
  });

  it("does not shrink below the minimum card width", () => {
    const size = computeSeatHandSize(40, 6, 56);
    expect(size.cardW).toBe(SEAT_CARD_MIN_W);
  });
});

describe("maxSeatCardWidthForViewport", () => {
  it("returns mobile / tablet / desktop caps", () => {
    expect(maxSeatCardWidthForViewport(390)).toBe(56);
    expect(maxSeatCardWidthForViewport(768)).toBe(64);
    expect(maxSeatCardWidthForViewport(1280)).toBe(80);
  });
});
