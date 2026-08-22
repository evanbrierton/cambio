export const SWIPE_EDGE_PX = 48;
export const SWIPE_AXIS_LOCK_PX = 12;
export const SWIPE_COMMIT_DISTANCE_PX = 72;
export const SWIPE_COMMIT_VELOCITY_PX_S = 700;

export function isFromLeaveEdge(
  clientX: number,
  edgeWidthPx = SWIPE_EDGE_PX,
): boolean {
  return clientX >= 0 && clientX <= edgeWidthPx;
}

export function isHorizontalLeaveLock(
  dx: number,
  dy: number,
  axisPx = SWIPE_AXIS_LOCK_PX,
): boolean {
  return dx >= axisPx && dx > Math.abs(dy);
}

export function isVerticalScrollLock(
  dx: number,
  dy: number,
  axisPx = SWIPE_AXIS_LOCK_PX,
): boolean {
  return Math.abs(dy) >= axisPx && Math.abs(dy) >= Math.abs(dx);
}

/** True when a horizontal rail is currently overflow-scrolling (not packed/static). */
export function isHorizontalScrollOverflow(rail: {
  scrollWidth: number;
  clientWidth: number;
  classList: { contains: (token: string) => boolean };
}): boolean {
  if (rail.classList.contains("is-static")) return false;
  return rail.scrollWidth > rail.clientWidth + 1;
}

/** True when the gesture target is inside a horizontally overflowing rail. */
export function isInsideHorizontalScrollTarget(
  target: EventTarget | null,
): boolean {
  if (!(target instanceof Element)) return false;
  const rail = target.closest(
    ".players-3d-rail, [data-horizontal-scroll='true']",
  );
  if (!(rail instanceof HTMLElement)) return false;
  return isHorizontalScrollOverflow(rail);
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
