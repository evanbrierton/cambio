export const SWIPE_EDGE_PX = 28;
export const SWIPE_COMMIT_DISTANCE_PX = 80;
export const SWIPE_COMMIT_VELOCITY_PX_S = 700;

export function isFromLeaveEdge(
  clientX: number,
  edgeWidthPx = SWIPE_EDGE_PX,
): boolean {
  return clientX >= 0 && clientX <= edgeWidthPx;
}

export function swipeVelocityPxS(
  fromX: number,
  toX: number,
  elapsedMs: number,
): number {
  if (elapsedMs <= 0) return 0;
  return ((toX - fromX) / elapsedMs) * 1000;
}

export function isSwipeCommit(
  offsetX: number,
  velocityX: number,
  distancePx = SWIPE_COMMIT_DISTANCE_PX,
  velocityPxS = SWIPE_COMMIT_VELOCITY_PX_S,
): boolean {
  if (offsetX >= distancePx) return true;
  return offsetX >= distancePx * 0.45 && velocityX >= velocityPxS;
}

export function clampSwipeOffset(offsetX: number, maxPx = 160): number {
  if (offsetX <= 0) return 0;
  return Math.min(offsetX, maxPx);
}
