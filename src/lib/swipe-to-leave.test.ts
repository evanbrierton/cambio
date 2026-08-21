import { describe, expect, it } from "vitest";
import {
  clampSwipeOffset,
  isFromLeaveEdge,
  isSwipeCommit,
  SWIPE_COMMIT_DISTANCE_PX,
  SWIPE_EDGE_PX,
  swipeVelocityPxS,
} from "./swipe-to-leave";

describe("swipe-to-leave", () => {
  it("starts only from the left edge", () => {
    expect(isFromLeaveEdge(0)).toBe(true);
    expect(isFromLeaveEdge(SWIPE_EDGE_PX)).toBe(true);
    expect(isFromLeaveEdge(SWIPE_EDGE_PX + 1)).toBe(false);
    expect(isFromLeaveEdge(-1)).toBe(false);
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
