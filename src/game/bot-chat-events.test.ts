import { describe, expect, it } from "vitest";
import { pickBotChatMessage } from "./bot-chat";
import {
  capturePreMoveSnapshot,
  detectMoveReaction,
  pickMoveReactionMessage,
} from "./bot-chat-events";
import {
  buildSystemPrompt,
  CAMBIO_RULES_FOR_CHAT,
  CAMBIO_VISIBILITY_FOR_CHAT,
  containsOffRosterPersonName,
} from "./bot-chat-llm";
import { createRoom } from "./engine";
import type { Card, CardSlot, GameState, PlayerState } from "./types";

function card(rank: Card["rank"], suit: Card["suit"] = "clubs"): Card {
  return { id: `${rank}-${suit}`, rank, suit };
}

function slot(c: Card | null): CardSlot {
  return { card: c, faceUp: false };
}

function alicePlayer(hand?: CardSlot[]): PlayerState {
  return {
    id: "alice",
    name: "Evan",
    hand: hand ?? [
      slot(card("K", "spades")),
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
    isBot: false,
    botDifficulty: null,
  };
}

function playingState(player: PlayerState = alicePlayer()): GameState {
  const state = createRoom("room-1", player.name, player.id);
  state.phase = "playing";
  state.players[0] = player;
  return state;
}

describe("detectMoveReaction card visibility (CAM-87)", () => {
  it("names discarded deck draws (public on discard pile)", () => {
    const player = alicePlayer();
    const reaction = detectMoveReaction(
      playingState(player),
      player,
      { type: "discard_drawn" },
      {},
      {
        drawnCard: card("A", "hearts"),
        swappedOutCard: null,
        drawnFromDiscard: false,
      },
      0,
    );

    expect(reaction?.kind).toBe("tossed_valuable_card");
    expect(reaction?.detail).toContain("A♥");
  });

  it("does not react to deck-draw swaps (private take + hand-card points)", () => {
    const player = alicePlayer();
    const reaction = detectMoveReaction(
      playingState(player),
      player,
      { type: "swap", slot: 0 },
      {},
      {
        drawnCard: card("J", "hearts"),
        swappedOutCard: card("K", "spades"),
        drawnFromDiscard: false,
      },
      0,
    );

    expect(reaction).toBeNull();
  });

  it("may name both public discard-pile swap cards without point totals", () => {
    const player = alicePlayer([
      slot(card("A", "hearts")),
      slot(card("3")),
      slot(card("4")),
      slot(card("5")),
    ]);
    const reaction = detectMoveReaction(
      playingState(player),
      player,
      { type: "swap", slot: 0 },
      {},
      {
        drawnCard: card("J", "clubs"),
        swappedOutCard: card("A", "hearts"),
        drawnFromDiscard: true,
      },
      0,
    );

    expect(reaction?.kind).toBe("bad_swap");
    expect(reaction?.detail).toContain("A♥");
    expect(reaction?.detail).toContain("J♣");
    expect(reaction?.detail).not.toMatch(/\d+\s*pts/i);
  });

  it("capturePreMoveSnapshot records drawnFromDiscard", () => {
    const state = createRoom("room-1", "Evan", "alice");
    state.phase = "playing";
    state.players[0].hand = [
      slot(card("K", "spades")),
      slot(card("3")),
      slot(card("4")),
      slot(card("5")),
    ];
    state.drawnCard = card("J", "hearts");
    state.drawnFromDiscard = false;

    const deckSnap = capturePreMoveSnapshot(state, "alice", {
      type: "swap",
      slot: 0,
    });
    expect(deckSnap?.drawnFromDiscard).toBe(false);
    expect(deckSnap?.drawnCard?.rank).toBe("J");
    expect(deckSnap?.swappedOutCard?.rank).toBe("K");

    state.drawnFromDiscard = true;
    state.drawnCard = card("A", "hearts");
    const discardSnap = capturePreMoveSnapshot(state, "alice", {
      type: "swap",
      slot: 0,
    });
    expect(discardSnap?.drawnFromDiscard).toBe(true);
  });
});

describe("bot chat LLM prompt (CAM-87)", () => {
  it("includes Cambio rules and public-only visibility guidance", () => {
    const prompt = buildSystemPrompt({
      difficulty: "medium",
      botName: "Peppy Clover",
      playerNames: ["Evan", "Peppy Clover"],
      recentChat: [],
      gamePhase: "playing",
      roundNumber: 1,
      focusTarping: false,
    });

    expect(prompt).toContain(CAMBIO_RULES_FOR_CHAT);
    expect(prompt).toContain(CAMBIO_VISIBILITY_FOR_CHAT);
    expect(prompt).toMatch(/discard pile/i);
    expect(prompt).toMatch(/PRIVATE/i);
    expect(prompt).toMatch(/Call Cambio/i);
    expect(prompt).toMatch(/point values/i);
  });
});

describe("bot chat player names (CAM-89)", () => {
  it("includes the roster and forbids invented human names, not insult nicknames", () => {
    const prompt = buildSystemPrompt({
      difficulty: "hard",
      botName: "Cosmic Nugget",
      playerNames: ["Evan", "Cosmic Nugget", "Lucky Pepper"],
      recentChat: [],
      gamePhase: "playing",
      roundNumber: 2,
      focusTarping: true,
    });

    expect(prompt).toContain("Evan, Cosmic Nugget, Lucky Pepper");
    expect(prompt).toMatch(/Never invent human first names/i);
    expect(prompt).toMatch(/Emily, Rachel/i);
    expect(prompt).toMatch(/Invent sharp, creative insulting nicknames/i);
    expect(prompt).toMatch(/Insult nicknames are fine/i);
  });

  it("flags invented human names that are not on the roster", () => {
    expect(
      containsOffRosterPersonName("Nice try, Emily!", [
        "Evan",
        "Cosmic Nugget",
      ]),
    ).toBe(true);
    expect(
      containsOffRosterPersonName("Rachel is bluffing hard.", [
        "Evan",
        "Cosmic Nugget",
      ]),
    ).toBe(true);
  });

  it("allows roster names, insult nicknames, and game terms", () => {
    expect(
      containsOffRosterPersonName("Evan, that snap was lucky.", [
        "Evan",
        "Cosmic Nugget",
      ]),
    ).toBe(false);
    expect(
      containsOffRosterPersonName(
        "Only a tarp goblin would discard that Ace.",
        ["Evan", "Cosmic Nugget"],
      ),
    ).toBe(false);
    expect(
      containsOffRosterPersonName("Cambio? Cosmic Nugget is bluffing.", [
        "Evan",
        "Cosmic Nugget",
      ]),
    ).toBe(false);
  });

  it("interpolates the real player name into move reaction templates", () => {
    const text = pickMoveReactionMessage("hard", {
      kind: "wrong_snap",
      playerName: "Evan",
      detail: "Evan snapped wrong and took a penalty.",
    });

    expect(text).toContain("Evan");
    expect(text).not.toContain("{name}");
  });

  it("keeps hard tarping insult nicknames in templates", () => {
    const text = pickBotChatMessage("hard", {
      focusTarping: true,
      playerName: "Evan",
    });

    expect(text).not.toContain("{name}");
    expect(text.toLowerCase()).toMatch(
      /tarp|fabric|pole|canvas|tent|camper|flat/,
    );
  });
});
