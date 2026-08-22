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

  it("does not attempt snaps when no penalty card can be dealt", () => {
    const state = botPlayingState("medium");
    state.deck = [];
    state.discard = [card("2", "diamonds")];
    state.snapEligibleTopCardId = state.discard[0].id;
    state.drawnCard = null;
    state.pendingAbility = null;
    state.turnStarted = false;
    state.players[1].hand[0] = slot(card("2", "hearts"));

    const knowledge = new BotKnowledge();
    knowledge.remember("bot-1", 0, card("2", "hearts"));

    const action = decideBotAction(state, "bot-1", knowledge);
    expect(action).toEqual({ type: "draw", source: "discard" });
    expect(action).not.toMatchObject({ type: "snap" });
  });
});

describe("bot snap value awareness (CAM-96)", () => {
  function snapReadyState(difficulty: "easy" | "medium" | "hard"): {
    state: GameState;
    knowledge: BotKnowledge;
  } {
    const state = botPlayingState(difficulty);
    state.deck = [card("A", "clubs"), card("3", "clubs"), card("4", "clubs")];
    state.drawnCard = null;
    state.pendingAbility = null;
    state.turnStarted = false;
    state.currentPlayerIndex = 0;
    const knowledge = new BotKnowledge();
    knowledge.prepareForState(state);
    return { state, knowledge };
  }

  it.each(["medium", "hard"] as const)(
    "does not snap an own black king when that is the only match (%s)",
    (difficulty) => {
      const { state, knowledge } = snapReadyState(difficulty);
      const blackKing = card("K", "spades");
      state.discard = [card("K", "hearts")];
      state.snapEligibleTopCardId = state.discard[0].id;
      state.players[1].hand[0] = slot(blackKing);
      knowledge.remember("bot-1", 0, blackKing);

      const action = decideBotAction(state, "bot-1", knowledge);
      expect(action).not.toMatchObject({ type: "snap" });
    },
  );

  it.each(["medium", "hard"] as const)(
    "does not snap an own joker when that is the only match (%s)",
    (difficulty) => {
      const { state, knowledge } = snapReadyState(difficulty);
      const joker = card("JOKER", "joker");
      state.discard = [card("JOKER", "joker")];
      state.snapEligibleTopCardId = state.discard[0].id;
      state.players[1].hand[0] = slot(joker);
      knowledge.remember("bot-1", 0, joker);

      const action = decideBotAction(state, "bot-1", knowledge);
      expect(action).not.toMatchObject({ type: "snap" });
    },
  );

  it.each(["medium", "hard"] as const)(
    "prefers snapping a high own card over an own black king (%s)",
    (difficulty) => {
      const { state, knowledge } = snapReadyState(difficulty);
      const blackKing = card("K", "clubs");
      const redKing = card("K", "hearts");
      state.discard = [card("K", "diamonds")];
      state.snapEligibleTopCardId = state.discard[0].id;
      state.players[1].hand[0] = slot(blackKing);
      state.players[1].hand[1] = slot(redKing);
      knowledge.remember("bot-1", 0, blackKing);
      knowledge.remember("bot-1", 1, redKing);

      const action = decideBotAction(state, "bot-1", knowledge);
      expect(action).toEqual({
        type: "snap",
        targetPlayerId: "bot-1",
        slot: 1,
      });
    },
  );

  it.each(["medium", "hard"] as const)(
    "prefers snapping an opponent high card over an own black king (%s)",
    (difficulty) => {
      const { state, knowledge } = snapReadyState(difficulty);
      const blackKing = card("K", "spades");
      const oppKing = card("K", "diamonds");
      state.discard = [card("K", "hearts")];
      state.snapEligibleTopCardId = state.discard[0].id;
      state.players[1].hand[0] = slot(blackKing);
      state.players[0].hand[0] = slot(oppKing);
      knowledge.remember("bot-1", 0, blackKing);
      knowledge.remember("alice", 0, oppKing);

      const action = decideBotAction(state, "bot-1", knowledge);
      expect(action).toEqual({
        type: "snap",
        targetPlayerId: "alice",
        slot: 0,
      });
    },
  );
});
