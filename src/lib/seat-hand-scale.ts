/** Card width / height — matches PlayerScrollStage. */
export const SEAT_CARD_RATIO = 5 / 7;

/** Approximate Tailwind `gap-1` / `lg:gap-1.5` between card columns. */
export const SEAT_CARD_GAP_PX = 6;

export const SEAT_CARD_MIN_W = 32;

export function maxSeatCardWidthForViewport(
  width: number = typeof window !== "undefined" ? window.innerWidth : 390,
): number {
  if (width >= 1024) return 80;
  if (width >= 640) return 64;
  return 56;
}

export type SeatHandSize = {
  cardW: number;
  cardH: number;
  handW: number;
  fontSize: number;
};

/**
 * Size seat cards so a 2×2 base hand plus penalty columns fit in `availableWidth`.
 * `maxCardW` caps growth (carousel height scale or responsive default).
 */
export function computeSeatHandSize(
  availableWidth: number,
  columnCount: number,
  maxCardW: number,
): SeatHandSize {
  const cols = Math.max(2, columnCount);
  const gaps = Math.max(0, cols - 1);
  let cardW = (Math.max(0, availableWidth) - gaps * SEAT_CARD_GAP_PX) / cols;
  cardW = Math.min(cardW, maxCardW);
  cardW = Math.max(SEAT_CARD_MIN_W, cardW);

  const cardH = cardW / SEAT_CARD_RATIO;
  const handW = cardW * 2 + SEAT_CARD_GAP_PX;
  const fontSize = Math.max(8, cardH * 0.14);

  return { cardW, cardH, handW, fontSize };
}
