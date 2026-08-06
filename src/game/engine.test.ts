import { describe, expect, it } from "vitest";
import { createRoom, finalizeRound } from "./engine";
import type { Card, CardSlot } from "./types";

function card(rank: Card["rank"], suit: Card["suit"] = "clubs"): Card {
  return { id: `${rank}-${suit}`, rank, suit };
}

function slot(c: Card | null): CardSlot {
  return { card: c, faceUp: false };
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
