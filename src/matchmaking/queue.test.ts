import { describe, expect, it } from "vitest";
import {
  assignPlayer,
  cancelAssignment,
  closeLobby,
  createMatchmakingQueueState,
  leaveLobby,
  normalizeMatchConfig,
  updateLobbyConfig,
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

  it("does not double-count the same playerId in a lobby", () => {
    const state = createMatchmakingQueueState();
    const config = normalizeMatchConfig(2, true);
    const first = assignPlayer(state, "p1", config, 1000);
    const again = assignPlayer(state, "p1", config, 1100);
    expect(again.roomId).toBe(first.roomId);

    const key = Object.keys(state.buckets)[0];
    expect(state.buckets[key][0].assignedCount).toBe(1);

    const second = assignPlayer(state, "p2", config, 1200);
    expect(second.roomId).toBe(first.roomId);
    expect(state.buckets[key][0].assignedCount).toBe(2);

    const third = assignPlayer(state, "p3", config, 1300);
    expect(third.roomId).not.toBe(first.roomId);
  });

  it("stops seating into a lobby after closeLobby", () => {
    const state = createMatchmakingQueueState();
    const config = normalizeMatchConfig(4, true);
    const first = assignPlayer(state, "p1", config, 1000);
    assignPlayer(state, "p2", config, 1100);
    closeLobby(state, first.roomId);

    const next = assignPlayer(state, "p3", config, 1200);
    expect(next.roomId).not.toBe(first.roomId);
    expect(state.assignments.p1).toBeUndefined();
    expect(state.assignments.p2).toBeUndefined();
  });

  it("does not reseat a player into a lobby they left", () => {
    const state = createMatchmakingQueueState();
    const config = normalizeMatchConfig(4, true);
    const first = assignPlayer(state, "p1", config, 1000);
    assignPlayer(state, "p2", config, 2000);
    leaveLobby(state, first.roomId, "p1");

    const again = assignPlayer(state, "p1", config, 3000);
    expect(again.roomId).not.toBe(first.roomId);
    expect(state.assignments.p2).toBe(first.roomId);
  });

  it("closes an empty lobby when the last player leaves", () => {
    const state = createMatchmakingQueueState();
    const config = normalizeMatchConfig(4, true);
    const first = assignPlayer(state, "p1", config, 1000);
    leaveLobby(state, first.roomId, "p1");

    const next = assignPlayer(state, "p2", config, 2000);
    expect(next.roomId).not.toBe(first.roomId);
  });

  it("lets another player take a seat after someone leaves", () => {
    const state = createMatchmakingQueueState();
    const config = normalizeMatchConfig(2, true);
    const first = assignPlayer(state, "p1", config, 1000);
    assignPlayer(state, "p2", config, 2000);
    leaveLobby(state, first.roomId, "p1");

    const next = assignPlayer(state, "p3", config, 3000);
    expect(next.roomId).toBe(first.roomId);
  });

  it("does not double-decrement on a repeated leave", () => {
    const state = createMatchmakingQueueState();
    const config = normalizeMatchConfig(4, true);
    const first = assignPlayer(state, "p1", config, 1000);
    assignPlayer(state, "p2", config, 2000);
    leaveLobby(state, first.roomId, "p1");
    leaveLobby(state, first.roomId, "p1");

    const key = Object.keys(state.buckets)[0];
    expect(state.buckets[key][0].assignedCount).toBe(1);
  });

  it("moves an open lobby when its match config changes", () => {
    const state = createMatchmakingQueueState();
    const four = normalizeMatchConfig(4, true);
    const two = normalizeMatchConfig(2, false);
    const first = assignPlayer(state, "p1", four, 1000);

    expect(updateLobbyConfig(state, first.roomId, two)).toBe(true);
    expect(state.buckets["4:1"] ?? []).toHaveLength(0);
    expect(state.buckets["2:0"]).toHaveLength(1);
    expect(state.buckets["2:0"][0].targetSize).toBe(2);
    expect(state.buckets["2:0"][0].fillWithBots).toBe(false);

    const next = assignPlayer(state, "p2", two, 2000);
    expect(next.roomId).toBe(first.roomId);
  });
});
