import { describe, expect, it } from "vitest";
import { penaltyGridPosition, penaltyGridShape } from "./penalty-grid";

describe("penaltyGridShape", () => {
  it("returns empty shape for no cards", () => {
    expect(penaltyGridShape(0)).toEqual({ rows: 0, cols: 0 });
  });

  it("keeps small counts on 2 rows", () => {
    expect(penaltyGridShape(1)).toEqual({ rows: 2, cols: 1 });
    expect(penaltyGridShape(2)).toEqual({ rows: 2, cols: 1 });
    expect(penaltyGridShape(4)).toEqual({ rows: 2, cols: 2 });
  });

  it("adds rows as the count grows instead of only adding columns", () => {
    expect(penaltyGridShape(6)).toEqual({ rows: 3, cols: 2 });
    expect(penaltyGridShape(9)).toEqual({ rows: 3, cols: 3 });
    expect(penaltyGridShape(10)).toEqual({ rows: 4, cols: 3 });
    expect(penaltyGridShape(16)).toEqual({ rows: 4, cols: 4 });
  });

  it("never uses more cells than needed", () => {
    for (const count of [1, 2, 3, 5, 7, 11, 15, 20]) {
      const { rows, cols } = penaltyGridShape(count);
      expect(rows * cols).toBeGreaterThanOrEqual(count);
      expect((cols - 1) * rows).toBeLessThan(count);
    }
  });
});

describe("penaltyGridPosition", () => {
  it("fills column-major order for the chosen row count", () => {
    expect(penaltyGridPosition(0, 3)).toEqual({ gridRow: 1, gridColumn: 1 });
    expect(penaltyGridPosition(1, 3)).toEqual({ gridRow: 2, gridColumn: 1 });
    expect(penaltyGridPosition(2, 3)).toEqual({ gridRow: 3, gridColumn: 1 });
    expect(penaltyGridPosition(3, 3)).toEqual({ gridRow: 1, gridColumn: 2 });
  });
});
