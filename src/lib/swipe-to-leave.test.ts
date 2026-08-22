import { describe, expect, it } from "vitest";
import {
  clampSwipeOffset,
  isFromLeaveEdge,
  isHorizontalLeaveLock,
  isHorizontalScrollOverflow,
  isSwipeCommit,
  isVerticalScrollLock,
  SWIPE_COMMIT_DISTANCE_PX,
  SWIPE_EDGE_PX,
  swipeVelocityPxS,
} from "./swipe-to-leave";

describe("swipe-to-leave", () => {
  it("identifies the left-edge eager zone", () => {
    expect(isFromLeaveEdge(0)).toBe(true);
    expect(isFromLeaveEdge(SWIPE_EDGE_PX)).toBe(true);
    expect(isFromLeaveEdge(SWIPE_EDGE_PX + 1)).toBe(false);
    expect(isFromLeaveEdge(-1)).toBe(false);
  });

  it("locks onto a right swipe before vertical scroll", () => {
    expect(isHorizontalLeaveLock(16, 4)).toBe(true);
    expect(isHorizontalLeaveLock(8, 2)).toBe(false);
    expect(isHorizontalLeaveLock(10, 12)).toBe(false);
    expect(isVerticalScrollLock(4, 16)).toBe(true);
    expect(isVerticalScrollLock(16, 4)).toBe(false);
  });

  it("detects overflowing horizontal rails", () => {
    const tokens = new Set<string>();
    const rail = {
      scrollWidth: 800,
      clientWidth: 320,
      classList: {
        contains: (token: string) => tokens.has(token),
      },
    };
    expect(isHorizontalScrollOverflow(rail)).toBe(true);

    tokens.add("is-static");
    expect(isHorizontalScrollOverflow(rail)).toBe(false);

    tokens.clear();
    rail.scrollWidth = 320;
    expect(isHorizontalScrollOverflow(rail)).toBe(false);
  });

  it("commits after a long drag or a fast flick", () => {
    expect(isSwipeCommit(SWIPE_COMMIT_DISTANCE_PX, 0)).toBe(true);
    expect(isSwipeCommit(36, 900)).toBe(true);
    expect(isSwipeCommit(20, 900)).toBe(false);
    expect(isSwipeCommit(40, 100)).toBe(false);
  });

  it("computes horizontal velocity", () => {
    expect(swipeVelocityPxS(0, 80, 100)).toBe(800);
    expect(swipeVelocityPxS(10, 10, 0)).toBe(0);
  });

  it("clamps the follow offset", () => {
    expect(clampSwipeOffset(-12)).toBe(0);
    expect(clampSwipeOffset(40)).toBe(40);
    expect(clampSwipeOffset(400, 160)).toBe(160);
  });
});
