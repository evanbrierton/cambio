import { describe, expect, it } from "vitest";
import {
  carouselPenaltyColumns,
  carouselPenaltyPosition,
  nearSquareGridPosition,
  nearSquareGridShape,
} from "./penalty-grid";

describe("nearSquareGridShape", () => {
  it("returns empty shape for no cards", () => {
    expect(nearSquareGridShape(0)).toEqual({ rows: 0, cols: 0 });
  });

  it("packs the base 4-card hand as 2×2", () => {
    expect(nearSquareGridShape(4)).toEqual({ rows: 2, cols: 2 });
  });

  it("includes base cards when growing with penalties", () => {
    // 4 base + 2 penalties
    expect(nearSquareGridShape(6)).toEqual({ rows: 3, cols: 2 });
    // 4 base + 5 penalties
    expect(nearSquareGridShape(9)).toEqual({ rows: 3, cols: 3 });
    // 4 base + 10 penalties
    expect(nearSquareGridShape(14)).toEqual({ rows: 4, cols: 4 });
  });

  it("never uses more cells than needed", () => {
    for (const count of [4, 5, 7, 11, 15, 20]) {
      const { rows, cols } = nearSquareGridShape(count);
      expect(rows * cols).toBeGreaterThanOrEqual(count);
      expect((cols - 1) * rows).toBeLessThan(count);
    }
  });
});

describe("nearSquareGridPosition", () => {
  it("fills row-major order so a 2×2 hand keeps peeks on the bottom", () => {
    expect(nearSquareGridPosition(0, 2)).toEqual({
      gridRow: 1,
      gridColumn: 1,
    });
    expect(nearSquareGridPosition(1, 2)).toEqual({
      gridRow: 1,
      gridColumn: 2,
    });
    expect(nearSquareGridPosition(2, 2)).toEqual({
      gridRow: 2,
      gridColumn: 1,
    });
    expect(nearSquareGridPosition(3, 2)).toEqual({
      gridRow: 2,
      gridColumn: 2,
    });
  });

  it("continues row-major when the packed hand grows", () => {
    expect(nearSquareGridPosition(4, 3)).toEqual({
      gridRow: 2,
      gridColumn: 2,
    });
    expect(nearSquareGridPosition(5, 3)).toEqual({
      gridRow: 2,
      gridColumn: 3,
    });
  });
});

describe("carouselPenaltyColumns", () => {
  it("keeps the classic 2-row strip", () => {
    expect(carouselPenaltyColumns(0)).toBe(0);
    expect(carouselPenaltyColumns(1)).toBe(1);
    expect(carouselPenaltyColumns(2)).toBe(1);
    expect(carouselPenaltyColumns(3)).toBe(2);
    expect(carouselPenaltyColumns(10)).toBe(5);
  });
});

describe("carouselPenaltyPosition", () => {
  it("fills a fixed 2-row column-major strip", () => {
    expect(carouselPenaltyPosition(0)).toEqual({ gridRow: 1, gridColumn: 1 });
    expect(carouselPenaltyPosition(1)).toEqual({ gridRow: 2, gridColumn: 1 });
    expect(carouselPenaltyPosition(2)).toEqual({ gridRow: 1, gridColumn: 2 });
  });
});
