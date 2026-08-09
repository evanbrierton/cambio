/**
 * Choose a penalty-card grid shape that stays closer to square as the
 * count grows, so fitted hands don't shrink into a wide 2-row strip.
 */
export function penaltyGridShape(count: number): {
  rows: number;
  cols: number;
} {
  if (count <= 0) return { rows: 0, cols: 0 };
  const rows = Math.max(2, Math.ceil(Math.sqrt(count)));
  const cols = Math.ceil(count / rows);
  return { rows, cols };
}

export function penaltyGridPosition(
  penaltyIndex: number,
  rows: number,
): {
  gridRow: number;
  gridColumn: number;
} {
  const safeRows = Math.max(1, rows);
  return {
    gridRow: (penaltyIndex % safeRows) + 1,
    gridColumn: Math.floor(penaltyIndex / safeRows) + 1,
  };
}
