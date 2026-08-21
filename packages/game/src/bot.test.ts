import { describe, expect, it } from "vitest";
import { BotKnowledge, decideBotAction } from "./bot";
import { createRoom } from "./engine";
import type { Card, CardSlot, GameState } from "./types";

function card(rank: Card["rank"], suit: Card["suit"] = "clubs"): Card {
  return { id: `${rank}-${suit}`, rank, suit };
}

function slot(c: Card | null): CardSlot {
  return { card: c, faceUp: false };
}

function botPlayingState(difficulty: "easy" | "medium" | "hard"): GameState {
  const state = createRoom("room-1", "Alice", "alice");
  state.players.push({
    id: "bot-1",
    name: "Bot",
    hand: [
      slot(card("2", "hearts")),
      slot(card("3", "hearts")),
      slot(card("4", "hearts")),
      slot(card("5", "hearts")),
    ],
    penaltyCount: 0,
    setupPeekedSlots: [],
    hasCalledCambio: false,
    finalTurnDone: false,
    isWaiting: false,
    connected: true,
    isBot: true,
    botDifficulty: difficulty,
  });
  state.cumulativeScores["bot-1"] = 0;
  state.phase = "playing";
  state.currentPlayerIndex = 1;
  state.players[0].hand = [
    slot(card("6", "spades")),
    slot(card("7", "spades")),
    slot(card("8", "spades")),
    slot(card("9", "spades")),
  ];
  return state;
}

describe("bot discard draw fallback (CAM-95)", () => {
  it.each(["easy", "medium", "hard"] as const)(
    "draws from discard when the deck cannot yield a card (%s)",
    (difficulty) => {
      const state = botPlayingState(difficulty);
      state.deck = [];
      state.discard = [card("K", "diamonds")];
      state.drawnCard = null;
      state.pendingAbility = null;
      state.turnStarted = false;

      const action = decideBotAction(state, "bot-1", new BotKnowledge());
      expect(action).toEqual({ type: "draw", source: "discard" });
    },
  );

  it("still draws from the deck when reshuffle is possible", () => {
    const state = botPlayingState("easy");
    state.deck = [];
    state.discard = [card("2", "clubs"), card("K", "diamonds")];
    state.drawnCard = null;
    state.pendingAbility = null;
    state.turnStarted = false;

    const action = decideBotAction(state, "bot-1", new BotKnowledge());
    expect(action).toEqual({ type: "draw", source: "deck" });
  });
});
