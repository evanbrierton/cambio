import { describe, expect, it } from "vitest";
import {
  assignPlayer,
  cancelAssignment,
  createMatchmakingQueueState,
  normalizeMatchConfig,
} from "./queue";

describe("matchmaking queue", () => {
  it("creates a new lobby when none are open", () => {
    const state = createMatchmakingQueueState();
    const config = normalizeMatchConfig(4, true);
    const first = assignPlayer(state, "p1", config, 1000);
    expect(first.roomId).toHaveLength(6);
    expect(first.targetSize).toBe(4);
    expect(first.fillWithBots).toBe(true);
  });

  it("seats into oldest open lobby with space (FIFO)", () => {
    const state = createMatchmakingQueueState();
    const config = normalizeMatchConfig(4, true);
    const first = assignPlayer(state, "p1", config, 1000);
    assignPlayer(state, "p2", config, 2000);
    const third = assignPlayer(state, "p3", config, 3000);
    expect(third.roomId).toBe(first.roomId);
  });

  it("never cross-matches different bucket configs", () => {
    const state = createMatchmakingQueueState();
    const four = normalizeMatchConfig(4, true);
    const two = normalizeMatchConfig(2, false);
    const a = assignPlayer(state, "p1", four, 1000);
    const b = assignPlayer(state, "p2", two, 1100);
    expect(a.roomId).not.toBe(b.roomId);
  });

  it("opens a new lobby when the oldest is full", () => {
    const state = createMatchmakingQueueState();
    const config = normalizeMatchConfig(2, true);
    const first = assignPlayer(state, "p1", config, 1000);
    assignPlayer(state, "p2", config, 2000);
    const third = assignPlayer(state, "p3", config, 3000);
    expect(third.roomId).not.toBe(first.roomId);
  });

  it("frees a seat on cancel", () => {
    const state = createMatchmakingQueueState();
    const config = normalizeMatchConfig(4, true);
    const first = assignPlayer(state, "p1", config, 1000);
    assignPlayer(state, "p2", config, 2000);
    cancelAssignment(state, "p1");
    const next = assignPlayer(state, "p3", config, 3000);
    expect(next.roomId).toBe(first.roomId);
  });
});
