import { describe, expect, it } from "vitest";
import { BotKnowledge } from "../src/game/bot";
import { cardPoints, normalizeCardPointValues } from "../src/game/cards";
import { createRoom, handleMessage } from "../src/game/engine";
import {
  type Card,
  type CardPointValues,
  DEFAULT_CARD_POINTS,
  type GameState,
} from "../src/game/types";

function card(rank: Card["rank"], suit: Card["suit"] = "clubs"): Card {
  return { id: `${rank}-${suit}`, rank, suit };
}

/** Mirrors party/cambio.ts migrateState cardPoints merge for persisted rooms. */
function migrateCardPoints(state: {
  cardPoints?: Partial<CardPointValues>;
}): GameState["cardPoints"] {
  return { ...DEFAULT_CARD_POINTS, ...state.cardPoints };
}

describe("CAM-64 verifier: ended phase host edits", () => {
  it("allows host to change card points when phase is ended", () => {
    const state = createRoom("room-1", "Alice", "alice");
    state.phase = "ended";
    state.roundNumber = 1;

    const result = handleMessage(state, "alice", {
      type: "set_card_points",
      values: { redKing: 12 },
    });

    expect(result).toEqual({});
    expect(state.cardPoints.redKing).toBe(12);
  });
});

describe("CAM-64 verifier: persisted room migration", () => {
  it("fills missing cardPoints fields with defaults", () => {
    expect(migrateCardPoints({})).toEqual(DEFAULT_CARD_POINTS);
  });

  it("preserves partial persisted overrides", () => {
    expect(migrateCardPoints({ cardPoints: { redKing: 18 } })).toEqual({
      ...DEFAULT_CARD_POINTS,
      redKing: 18,
    });
  });

  it("normalizes out-of-range persisted values", () => {
    expect(
      normalizeCardPointValues(migrateCardPoints({ cardPoints: { ace: -99 } })),
    ).toEqual({
      ...DEFAULT_CARD_POINTS,
      ace: -5,
    });
  });
});

describe("CAM-64 verifier: bot decisions use room values", () => {
  it("BotKnowledge.points reflects configured cardPoints after prepareForState", () => {
    const state = createRoom("room-1", "Alice", "alice");
    handleMessage(state, "alice", {
      type: "set_card_points",
      values: { redKing: 7, blackKing: -1 },
    });

    const knowledge = new BotKnowledge();
    knowledge.prepareForState(state);
    knowledge.remember("alice", 0, card("K", "hearts"));

    expect(knowledge.points("alice", 0)).toBe(7);
    expect(cardPoints(card("K", "spades"), state.cardPoints)).toBe(-1);
  });
});
