import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createRoom, handleMessage, SNAP_WINDOW_MS } from "./engine";
import { GameHost } from "./host";
import type { ServerMessage } from "./types";

function createTestHost(roomId = "test-room") {
  const persistCalls: number[] = [];
  const host = new GameHost({
    roomId,
    onPersist: async () => {
      persistCalls.push(Date.now());
    },
  });
  return { host, persistCalls };
}

function mockPeer(playerId: string) {
  const sent: ServerMessage[] = [];
  return {
    peerId: crypto.randomUUID(),
    playerId,
    sent,
    peer: {
      playerId,
      connected: true,
      send: (message: ServerMessage) => {
        sent.push(message);
      },
    },
  };
}

describe("GameHost", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("creates a room and joins the host player", async () => {
    const { host } = createTestHost();
    const { peerId } = mockPeer("pending");
    host.addPeer(peerId, {
      playerId: "pending",
      connected: true,
      send: () => {},
    });

    const result = await host.handleConnect({
      queryPlayerId: null,
      name: "Alice",
      isSolo: false,
      botCount: 1,
      difficulty: "easy",
    });

    expect(result.error).toBeUndefined();
    expect(host.getState()?.hostId).toBe(result.playerId);
    expect(host.getState()?.players).toHaveLength(1);
    expect(host.getState()?.players[0].name).toBe("Alice");
  });

  it("broadcasts filtered player views to peers", async () => {
    const { host } = createTestHost();
    const alice = mockPeer("alice");
    const bob = mockPeer("bob");

    await host.handleConnect({
      queryPlayerId: null,
      name: "Alice",
      isSolo: false,
      botCount: 1,
      difficulty: "easy",
    });
    const hostId = host.getState()?.hostId ?? "";
    alice.peer.playerId = hostId;
    host.addPeer(alice.peerId, alice.peer);

    await host.handleConnect({
      queryPlayerId: null,
      name: "Bob",
      isSolo: false,
      botCount: 1,
      difficulty: "easy",
    });
    const bobId =
      host.getState()?.players.find((p) => p.name === "Bob")?.id ?? "";
    bob.peer.playerId = bobId;
    host.addPeer(bob.peerId, bob.peer);

    alice.sent.length = 0;
    bob.sent.length = 0;
    host.broadcastState();

    expect(alice.sent.some((m) => m.type === "state")).toBe(true);
    expect(bob.sent.some((m) => m.type === "state")).toBe(true);
    const aliceView = alice.sent.find((m) => m.type === "state");
    const bobView = bob.sent.find((m) => m.type === "state");
    if (aliceView?.type === "state" && bobView?.type === "state") {
      expect(aliceView.view.playerId).toBe(hostId);
      expect(bobView.view.playerId).toBe(bobId);
    }
  });

  it("routes secret peek to the acting player only", () => {
    const { host } = createTestHost();
    const alice = mockPeer("alice");
    const bob = mockPeer("bob");
    host.addPeer(alice.peerId, alice.peer);
    host.addPeer(bob.peerId, bob.peer);

    host.sendToPlayer("alice", {
      type: "secret_peek",
      playerId: "bob",
      slot: 0,
      card: { id: "test", rank: "5", suit: "hearts" },
    });

    expect(alice.sent.some((m) => m.type === "secret_peek")).toBe(true);
    expect(bob.sent.some((m) => m.type === "secret_peek")).toBe(false);
  });

  it("expires snap window on alarm", async () => {
    const state = createRoom("room", "Alice", "alice");
    state.phase = "snap_window";
    state.snapWindowEndsAt = Date.now() + SNAP_WINDOW_MS;

    const { host } = createTestHost();
    host.setState(state);

    vi.advanceTimersByTime(SNAP_WINDOW_MS + 1);
    await host.onSnapWindowAlarm();

    expect(host.getState()?.phase).not.toBe("snap_window");
  });

  it("marks player disconnected and broadcasts", async () => {
    const { host } = createTestHost();
    await host.handleConnect({
      queryPlayerId: null,
      name: "Alice",
      isSolo: false,
      botCount: 1,
      difficulty: "easy",
    });
    const playerId = host.getState()?.hostId ?? "";
    const { peerId, peer } = mockPeer(playerId);
    host.addPeer(peerId, peer);

    await host.handleDisconnect(playerId, peerId);

    const player = host.getState()?.players.find((p) => p.id === playerId);
    expect(player?.connected).toBe(false);
  });

  it("reconnects player by name when id is unknown", async () => {
    const { host } = createTestHost();
    await host.handleConnect({
      queryPlayerId: null,
      name: "Alice",
      isSolo: false,
      botCount: 1,
      difficulty: "easy",
    });
    const originalId = host.getState()?.hostId ?? "";
    const player = host.getState()?.players.find((p) => p.id === originalId);
    if (player) player.connected = false;

    const reclaimed = host.resolveReconnectPlayerId(null, "Alice");
    expect(reclaimed).toBe(originalId);
  });

  it("schedules bot turns in solo mode", async () => {
    const { host } = createTestHost();
    await host.handleConnect({
      queryPlayerId: null,
      name: "Alice",
      isSolo: true,
      botCount: 1,
      difficulty: "easy",
    });

    const gameState = host.getState();
    expect(gameState?.isSoloMode).toBe(true);
    expect(gameState?.players.some((p) => p.isBot)).toBe(true);

    if (gameState) {
      handleMessage(gameState, gameState.hostId, { type: "start_game" });
    }
    host.scheduleBotTurns();

    vi.advanceTimersByTime(60_000);
    expect(host.getState()?.botThinkingId).toBeNull();
  });
});
