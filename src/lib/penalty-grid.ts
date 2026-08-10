/**
 * Near-square grid shape for packing a full hand (base slots + penalties)
 * in grid view, so cards stay larger as the count grows.
 */
export function nearSquareGridShape(count: number): {
  rows: number;
  cols: number;
} {
  if (count <= 0) return { rows: 0, cols: 0 };
  const rows = Math.max(2, Math.ceil(Math.sqrt(count)));
  const cols = Math.ceil(count / rows);
  return { rows, cols };
}

export function nearSquareGridPosition(
  index: number,
  rows: number,
): {
  gridRow: number;
  gridColumn: number;
} {
  const safeRows = Math.max(1, rows);
  return {
    gridRow: (index % safeRows) + 1,
    gridColumn: Math.floor(index / safeRows) + 1,
  };
}

/** Classic carousel penalty strip: always 2 rows, growing by columns. */
export function carouselPenaltyColumns(count: number): number {
  if (count <= 0) return 0;
  if (count <= 2) return 1;
  return Math.ceil(count / 2);
}

export function carouselPenaltyPosition(penaltyIndex: number): {
  gridRow: number;
  gridColumn: number;
} {
  return {
    gridRow: (penaltyIndex % 2) + 1,
    gridColumn: Math.floor(penaltyIndex / 2) + 1,
  };
}
