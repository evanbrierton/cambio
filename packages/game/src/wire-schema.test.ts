import { describe, expect, it } from "vitest";
import { DEFAULT_CARD_POINTS } from "./types";
import {
  clientMessageSchema,
  parseClientMessage,
  parseClientMessageJson,
  parseServerMessage,
  parseServerMessageJson,
  serverMessageSchema,
} from "./wire-schema";

describe("wire-schema client messages", () => {
  it("accepts valid client messages", () => {
    expect(parseClientMessage({ type: "start_game" })).toEqual({
      type: "start_game",
    });
    expect(
      parseClientMessage({
        type: "join",
        name: "Alice",
        playerId: "p1",
      }),
    ).toEqual({ type: "join", name: "Alice", playerId: "p1" });
    expect(
      parseClientMessage({
        type: "set_card_points",
        values: { redKing: 20 },
      }),
    ).toEqual({ type: "set_card_points", values: { redKing: 20 } });
    expect(
      parseClientMessage({
        type: "draw",
        source: "deck",
      }),
    ).toEqual({ type: "draw", source: "deck" });
  });

  it("rejects invalid client messages", () => {
    expect(parseClientMessage(null)).toBeNull();
    expect(parseClientMessage({})).toBeNull();
    expect(parseClientMessage({ type: "draw" })).toBeNull();
    expect(parseClientMessage({ type: "unknown" })).toBeNull();
    expect(parseClientMessage({ type: "join" })).toBeNull();
    expect(
      parseClientMessage({
        type: "set_card_points",
        values: { redKing: "25" },
      }),
    ).toBeNull();
  });

  it("rejects malformed JSON safely", () => {
    expect(parseClientMessageJson("{")).toBeNull();
    expect(parseClientMessageJson("not json")).toBeNull();
  });
});

describe("wire-schema server messages", () => {
  it("accepts flash and control server messages", () => {
    expect(parseServerMessage({ type: "reshuffle_flash" })).toEqual({
      type: "reshuffle_flash",
    });
    expect(
      parseServerMessage({
        type: "error",
        message: "Nope",
      }),
    ).toEqual({ type: "error", message: "Nope" });
    expect(
      parseServerMessage({
        type: "room_info",
        roomId: "abc",
        playerId: "p1",
      }),
    ).toEqual({ type: "room_info", roomId: "abc", playerId: "p1" });
    expect(
      parseServerMessage({
        type: "swap_flash",
        slots: [{ playerId: "p1", slot: 0 }],
      }),
    ).toEqual({
      type: "swap_flash",
      slots: [{ playerId: "p1", slot: 0 }],
    });
  });

  it("accepts state messages with card point fields", () => {
    const view = {
      roomId: "room",
      playerId: "p1",
      phase: "lobby" as const,
      ownSetupPeekedSlots: [],
      players: [],
      currentPlayerIndex: 0,
      deckCount: 52,
      discardTop: null,
      drawnCard: null,
      drawnFromDiscard: false,
      hasDrawnCard: false,
      canCallCambio: false,
      canDraw: false,
      canDrawFromDeck: false,
      canSwap: false,
      canDiscardDrawn: false,
      canSnap: false,
      pendingAbility: null,
      snapGivePending: false,
      debugReveal: false,
      isWaiting: false,
      canStartGame: true,
      canShowResults: false,
      roundNumber: 0,
      roundHistory: [],
      cumulativeScores: {},
      cambioCallerId: null,
      winnerIds: [],
      scores: null,
      snapWindowEndsAt: null,
      isSoloMode: false,
      isMatchmade: false,
      matchTargetSize: 4,
      matchFillWithBots: true,
      matchHumanCount: 1,
      matchStartingSoon: false,
      canAddBot: true,
      jokerCount: 2,
      canSetJokerCount: true,
      cardPoints: DEFAULT_CARD_POINTS,
      canSetCardPoints: true,
      log: [],
      chatMessages: [],
    };

    const parsed = parseServerMessage({ type: "state", view });
    expect(parsed).toEqual({ type: "state", view });
    expect(serverMessageSchema.safeParse({ type: "state", view }).success).toBe(
      true,
    );
  });

  it("rejects invalid server messages", () => {
    expect(parseServerMessage({ type: "state" })).toBeNull();
    expect(parseServerMessageJson("[]")).toBeNull();
  });
});

describe("wire-schema round-trip", () => {
  it("parses JSON produced by schema-valid payloads", () => {
    const message = { type: "set_joker_count" as const, count: 3 };
    expect(clientMessageSchema.parse(message)).toEqual(message);
    expect(parseClientMessageJson(JSON.stringify(message))).toEqual(message);
  });
});
