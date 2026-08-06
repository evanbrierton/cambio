import { describe, expect, it } from "vitest";
import {
  createRoom,
  expireSnapWindow,
  finalizeRound,
  handleMessage,
  SNAP_WINDOW_MS,
} from "./engine";
import type { Card, CardSlot, GameState } from "./types";

function card(rank: Card["rank"], suit: Card["suit"] = "clubs"): Card {
  return { id: `${rank}-${suit}`, rank, suit };
}

function slot(c: Card | null): CardSlot {
  return { card: c, faceUp: false };
}

function playingState(): GameState {
  const state = createRoom("room-1", "Alice", "alice");
  state.players.push({
    id: "bob",
    name: "Bob",
    hand: [slot(card("2")), slot(card("3")), slot(card("4")), slot(card("5"))],
    penaltyCount: 0,
    setupPeekedSlots: [],
    hasCalledCambio: false,
    finalTurnDone: false,
    isWaiting: false,
    connected: true,
    isBot: false,
    botDifficulty: null,
  });
  state.cumulativeScores.bob = 0;
  state.phase = "playing";
  state.currentPlayerIndex = 0;
  state.players[0].hand = [
    slot(card("2", "hearts")),
    slot(card("3", "hearts")),
    slot(card("4", "hearts")),
    slot(card("5", "hearts")),
  ];
  return state;
}

describe("finalizeRound", () => {
  it("includes players with empty hands (score 0) on the leaderboard", () => {
    const state = createRoom("room-1", "Alice", "alice");
    state.players.push({
      id: "bob",
      name: "Bob",
      hand: [],
      penaltyCount: 0,
      setupPeekedSlots: [],
      hasCalledCambio: false,
      finalTurnDone: false,
      isWaiting: false,
      connected: true,
      isBot: false,
      botDifficulty: null,
    });
    state.cumulativeScores.bob = 0;
    state.roundNumber = 1;

    // Alice still holds cards; Bob snapped everything away (empty hand → 0).
    state.players[0].hand = [slot(card("5")), slot(card("8"))];
    state.players[1].hand = [];

    finalizeRound(state);

    const result = state.roundHistory.at(-1);
    expect(result).toBeDefined();
    expect(result?.entries).toEqual([
      { id: "alice", name: "Alice", score: 13 },
      { id: "bob", name: "Bob", score: 0 },
    ]);
    expect(state.scores).toEqual({ alice: 13, bob: 0 });
    expect(state.winnerIds).toEqual(["bob"]);
  });
});

describe("discard abilities (CAM-76)", () => {
  it("triggers ability when a deck-drawn ability card is discarded", () => {
    const state = playingState();
    state.drawnCard = card("Q");
    state.drawnFromDiscard = false;

    const result = handleMessage(state, "alice", { type: "discard_drawn" });

    expect(result).toEqual({});
    expect(state.pendingAbility).toEqual({
      playerId: "alice",
      kind: "queen_look",
      lookedCards: [],
      maxLooks: 1,
    });
  });

  it("does not trigger ability when an ability card is swapped out of hand", () => {
    const state = playingState();
    const queen = card("Q");
    state.players[0].hand[0] = slot(queen);
    state.drawnCard = card("2", "spades");
    state.drawnFromDiscard = false;

    const result = handleMessage(state, "alice", { type: "swap", slot: 0 });

    expect("error" in result).toBe(false);
    expect(state.discard.at(-1)).toEqual(queen);
    expect(state.pendingAbility).toBeNull();
  });

  it("does not trigger ability for each ability rank when swapped out", () => {
    const abilityRanks: Array<Card["rank"]> = [
      "7",
      "8",
      "9",
      "10",
      "J",
      "Q",
      "K",
    ];

    for (const rank of abilityRanks) {
      const state = playingState();
      const abilityCard = card(rank);
      state.players[0].hand[1] = slot(abilityCard);
      state.drawnCard = card("A");
      state.drawnFromDiscard = true;

      const result = handleMessage(state, "alice", { type: "swap", slot: 1 });

      expect("error" in result).toBe(false);
      expect(state.discard.at(-1)).toEqual(abilityCard);
      expect(state.pendingAbility).toBeNull();
    }
  });
});

describe("expireSnapWindow (CAM-14)", () => {
  function snapWindowState(now: number): GameState {
    const state = playingState();
    state.phase = "snap_window";
    state.discard = [card("5", "spades")];
    state.snapWindowEndsAt = now + SNAP_WINDOW_MS;
    state.players[0].hand = [
      slot(card("2")),
      slot(card("3")),
      slot(card("4")),
      slot(card("6")),
    ];
    state.players[1].hand = [
      slot(card("5", "hearts")),
      slot(card("7")),
      slot(card("8")),
      slot(card("9")),
    ];
    return state;
  }

  it("reveals cards when the snap window deadline passes", () => {
    const now = 1_000_000;
    const state = snapWindowState(now);
    state.snapWindowEndsAt = now;

    expect(expireSnapWindow(state, now)).toBe(true);
    expect(state.phase).toBe("revealed");
    expect(state.snapWindowEndsAt).toBeNull();
  });

  it("does not loop when a pending snap_give is unresolved at expiry", () => {
    const now = 1_000_000;
    const state = snapWindowState(now);
    state.snapWindowEndsAt = now;
    state.pendingAbility = {
      playerId: "alice",
      kind: "snap_give",
      lookedCards: [],
      maxLooks: 0,
      snapTargetPlayerId: "bob",
    };

    expect(expireSnapWindow(state, now)).toBe(true);
    expect(state.phase).toBe("revealed");
    expect(state.pendingAbility).toBeNull();
    expect(state.snapWindowEndsAt).toBeNull();

    expect(expireSnapWindow(state, now + 10_000)).toBe(false);
    expect(state.phase).toBe("revealed");
  });

  it("extends the deadline once when an opponent snap starts snap_give", () => {
    const now = 1_000_000;
    const state = snapWindowState(now);
    state.snapWindowEndsAt = now + 500;

    const before = Date.now();
    const result = handleMessage(state, "alice", {
      type: "snap",
      targetPlayerId: "bob",
      slot: 0,
    });
    const after = Date.now();

    expect("error" in result).toBe(false);
    expect(state.pendingAbility?.kind).toBe("snap_give");
    expect(state.phase).toBe("snap_window");
    expect(state.snapWindowEndsAt).toBeGreaterThanOrEqual(before + 3_000);
    expect(state.snapWindowEndsAt).toBeLessThanOrEqual(after + 3_000);

    expect(expireSnapWindow(state, state.snapWindowEndsAt ?? after)).toBe(true);
    expect(state.phase).toBe("revealed");
    expect(state.pendingAbility).toBeNull();
  });
});
