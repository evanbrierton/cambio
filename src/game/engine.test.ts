import { describe, expect, it } from "vitest";
import {
  buildPlayerView,
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

describe("auto Cambio call on empty hand (CAM-9)", () => {
  function setSnapReadyState(state: GameState, top: Card): void {
    state.discard = [top];
    state.snapEligibleTopCardId = top.id;
  }

  it("auto-calls Cambio when a successful snap empties a hand", () => {
    const state = playingState();
    state.players[0].hand = [slot(card("2", "hearts"))];
    setSnapReadyState(state, card("2", "spades"));

    const result = handleMessage(state, "bob", {
      type: "snap",
      targetPlayerId: "alice",
      slot: 0,
    });

    expect("error" in result).toBe(false);
    expect(state.phase).toBe("cambio_final");
    expect(state.cambioCallerId).toBe("alice");
    expect(state.players[0].hasCalledCambio).toBe(true);
  });

  it("does not auto-call Cambio when the snapped player still has cards", () => {
    const state = playingState();
    state.players[0].hand = [
      slot(card("2", "hearts")),
      slot(card("3", "hearts")),
    ];
    setSnapReadyState(state, card("2", "spades"));

    handleMessage(state, "bob", {
      type: "snap",
      targetPlayerId: "alice",
      slot: 0,
    });

    expect(state.phase).toBe("playing");
    expect(state.cambioCallerId).toBeNull();
    expect(state.players[0].hasCalledCambio).toBe(false);
  });

  it("applies the same caller protections as manual Cambio", () => {
    const state = playingState();
    state.players[0].hand = [slot(card("2", "hearts"))];
    setSnapReadyState(state, card("2", "spades"));

    handleMessage(state, "alice", {
      type: "snap",
      targetPlayerId: "alice",
      slot: 0,
    });

    state.players[0].hand = [slot(card("A", "clubs"))];

    expect(
      handleMessage(state, "alice", {
        type: "snap",
        targetPlayerId: "bob",
        slot: 0,
      }).error,
    ).toBe("Cambio caller cannot snap.");

    state.pendingAbility = {
      playerId: "bob",
      kind: "spy",
      lookedCards: [],
      maxLooks: 1,
    };
    expect(
      handleMessage(state, "bob", {
        type: "ability_look",
        playerId: "alice",
        slot: 0,
      }).error,
    ).toBe("That player is protected.");

    state.pendingAbility = {
      playerId: "bob",
      kind: "blind_switch",
      lookedCards: [],
      maxLooks: 0,
    };
    expect(
      handleMessage(state, "bob", {
        type: "ability_swap",
        fromPlayerId: "alice",
        fromSlot: 0,
        toPlayerId: "bob",
        toSlot: 0,
      }).error,
    ).toBe("That player's cards are protected.");
  });

  it("does not auto-call again when Cambio is already active", () => {
    const state = playingState();
    state.phase = "cambio_final";
    state.cambioCallerId = "alice";
    state.players[0].hasCalledCambio = true;
    state.players[1].hasCalledCambio = false;
    state.currentPlayerIndex = 1;
    state.players[1].hand = [slot(card("2", "hearts"))];
    setSnapReadyState(state, card("2", "spades"));

    handleMessage(state, "bob", {
      type: "snap",
      targetPlayerId: "bob",
      slot: 0,
    });

    expect(state.phase).toBe("cambio_final");
    expect(state.cambioCallerId).toBe("alice");
    expect(state.players[0].hasCalledCambio).toBe(true);
    expect(state.players[1].hasCalledCambio).toBe(false);
  });

  it("auto-calls Cambio when snap_give empties the giver's hand", () => {
    const state = playingState();
    state.currentPlayerIndex = 0;
    state.players[0].hand = [slot(card("K", "hearts"))];
    state.players[1].hand = [slot(card("2", "clubs"))];
    state.pendingAbility = {
      playerId: "alice",
      kind: "snap_give",
      lookedCards: [],
      maxLooks: 0,
      snapTargetPlayerId: "bob",
    };

    const result = handleMessage(state, "alice", {
      type: "snap_give",
      slot: 0,
    });

    expect("error" in result).toBe(false);
    expect(state.pendingAbility).toBeNull();
    expect(state.phase).toBe("cambio_final");
    expect(state.cambioCallerId).toBe("alice");
    expect(state.players[0].hasCalledCambio).toBe(true);
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

  it("skips spy in cambio_final when the only opponent is protected", () => {
    const state = playingState();
    state.deck = [card("9", "spades")];

    const cambio = handleMessage(state, "alice", { type: "call_cambio" });
    expect("error" in cambio).toBe(false);
    expect(state.phase).toBe("cambio_final");
    expect(state.currentPlayerIndex).toBe(1);

    const draw = handleMessage(state, "bob", { type: "draw", source: "deck" });
    expect("error" in draw).toBe(false);
    expect(state.drawnCard?.rank).toBe("9");

    const discard = handleMessage(state, "bob", { type: "discard_drawn" });

    expect(discard).toEqual({});
    expect(state.pendingAbility).toBeNull();
    expect(state.drawnCard).toBeNull();
    expect(state.phase).toBe("snap_window");
    expect(state.players[1].finalTurnDone).toBe(true);
    expect(
      state.log.some((entry) =>
        entry.includes("Spy ability skipped — no legal targets."),
      ),
    ).toBe(true);
  });

  it("skips spy when all opponents have no cards", () => {
    const state = playingState();
    state.players[1].hand = [];
    state.drawnCard = card("10", "diamonds");
    state.drawnFromDiscard = false;

    const result = handleMessage(state, "alice", { type: "discard_drawn" });

    expect(result).toEqual({});
    expect(state.pendingAbility).toBeNull();
    expect(state.drawnCard).toBeNull();
    expect(state.phase).toBe("playing");
    expect(
      state.log.some((entry) => entry.includes("Alice ended their turn.")),
    ).toBe(true);
    expect(
      state.log.some((entry) =>
        entry.includes("Spy ability skipped — no legal targets."),
      ),
    ).toBe(true);
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

describe("snap_give blocks play (CAM-13)", () => {
  function withSnapGivePending(state: GameState): GameState {
    state.discard = [card("5", "spades")];
    state.snapEligibleTopCardId = state.discard[0].id;
    state.pendingAbility = {
      playerId: "alice",
      kind: "snap_give",
      lookedCards: [],
      maxLooks: 0,
      snapTargetPlayerId: "bob",
    };
    return state;
  }

  it("blocks draw, swap, discard, snap, and cambio until snap_give resolves", () => {
    const state = withSnapGivePending(playingState());
    state.drawnCard = card("2", "diamonds");
    state.drawnFromDiscard = false;
    state.turnStarted = true;

    expect(
      handleMessage(state, "bob", { type: "draw", source: "deck" }).error,
    ).toBe("Wait for the snap card to be given.");
    expect(handleMessage(state, "alice", { type: "swap", slot: 0 }).error).toBe(
      "Wait for the snap card to be given.",
    );
    expect(handleMessage(state, "alice", { type: "discard_drawn" }).error).toBe(
      "Wait for the snap card to be given.",
    );
    expect(
      handleMessage(state, "bob", {
        type: "snap",
        targetPlayerId: "alice",
        slot: 0,
      }).error,
    ).toBe("Wait for the snap card to be given.");

    state.drawnCard = null;
    state.turnStarted = false;
    expect(handleMessage(state, "alice", { type: "call_cambio" }).error).toBe(
      "Wait for the snap card to be given.",
    );
  });

  it("allows the snap winner to give a card, then clears pending state", () => {
    const state = withSnapGivePending(playingState());
    const given = state.players[0].hand[1].card;

    const result = handleMessage(state, "alice", {
      type: "snap_give",
      slot: 1,
    });

    expect("error" in result).toBe(false);
    expect(state.pendingAbility).toBeNull();
    expect(state.players[0].hand[1].card).toBeNull();
    expect(state.players[1].hand.some((s) => s.card?.id === given?.id)).toBe(
      true,
    );
  });

  it("exposes snapGivePending to all players and pendingAbility only to the giver", () => {
    const state = withSnapGivePending(playingState());

    const aliceView = buildPlayerView(state, "alice");
    const bobView = buildPlayerView(state, "bob");

    expect(aliceView.snapGivePending).toBe(true);
    expect(bobView.snapGivePending).toBe(true);
    expect(aliceView.pendingAbility?.kind).toBe("snap_give");
    expect(bobView.pendingAbility).toBeNull();
    expect(aliceView.canCallCambio).toBe(false);
    expect(bobView.canCallCambio).toBe(false);
    expect(aliceView.canSnap).toBe(false);
    expect(bobView.canSnap).toBe(false);
    expect(aliceView.canDraw).toBe(false);
    expect(bobView.canDraw).toBe(false);
  });
});

describe("snap chain ownership", () => {
  it("lets the first snapper keep chaining while blocking other players", () => {
    const state = playingState();
    const discarded = card("5", "spades");
    state.discard = [discarded];
    state.snapEligibleTopCardId = discarded.id;
    state.players[0].hand[0] = slot(card("5", "hearts"));
    state.players[0].hand[1] = slot(card("5", "clubs"));
    state.players[1].hand[0] = slot(card("5", "diamonds"));

    const firstSnap = handleMessage(state, "alice", {
      type: "snap",
      targetPlayerId: "alice",
      slot: 0,
    });
    expect("error" in firstSnap).toBe(false);
    expect(state.snapChainPlayerId).toBe("alice");
    expect(state.snapEligibleTopCardId).toBe(state.discard.at(-1)?.id);

    const blockedSnap = handleMessage(state, "bob", {
      type: "snap",
      targetPlayerId: "bob",
      slot: 0,
    });
    expect(blockedSnap.error).toBe("No snap available right now.");
    expect(state.players[1].hand[0].card?.rank).toBe("5");
    expect(state.players[1].penaltyCount).toBe(0);

    const chainSnap = handleMessage(state, "alice", {
      type: "snap",
      targetPlayerId: "alice",
      slot: 1,
    });
    expect("error" in chainSnap).toBe(false);
    expect(state.players[0].hand[1].card).toBeNull();
    expect(state.snapChainPlayerId).toBe("alice");
    expect(state.discard.at(-1)?.id).toBe("5-clubs");
  });

  it("clears the snap lock after a non-snap discard so any player can snap again", () => {
    const state = playingState();
    const discarded = card("5", "spades");
    state.discard = [discarded];
    state.snapEligibleTopCardId = discarded.id;
    state.players[0].hand[0] = slot(card("5", "hearts"));
    state.players[1].hand[0] = slot(card("6", "diamonds"));
    state.players[1].hand[1] = slot(card("6", "clubs"));

    expect(
      "error" in
        handleMessage(state, "alice", {
          type: "snap",
          targetPlayerId: "alice",
          slot: 0,
        }),
    ).toBe(false);
    expect(state.snapChainPlayerId).toBe("alice");

    state.currentPlayerIndex = 1;
    state.drawnCard = card("6", "hearts");
    state.drawnFromDiscard = false;
    expect(handleMessage(state, "bob", { type: "discard_drawn" })).toEqual({});
    expect(state.snapChainPlayerId).toBeNull();
    expect(state.snapEligibleTopCardId).toBe("6-hearts");

    const bobSnap = handleMessage(state, "bob", {
      type: "snap",
      targetPlayerId: "bob",
      slot: 0,
    });
    expect("error" in bobSnap).toBe(false);
    expect(state.snapChainPlayerId).toBe("bob");
    expect(state.players[1].hand[0].card).toBeNull();
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

describe("reconnect with drawn card (CAM-74)", () => {
  it("restores drawn card and actions after disconnect + join", () => {
    const state = playingState();
    const drawn = card("9", "hearts");
    state.drawnCard = drawn;
    state.drawnFromDiscard = false;
    state.turnStarted = true;
    state.players[0].connected = false;

    const join = handleMessage(state, "alice", {
      type: "join",
      playerId: "alice",
      name: "Alice",
    });
    expect(join).toEqual({});
    expect(state.players[0].connected).toBe(true);
    expect(state.drawnCard).toEqual(drawn);

    const view = buildPlayerView(state, "alice");
    expect(view.drawnCard).toEqual(drawn);
    expect(view.hasDrawnCard).toBe(true);
    expect(view.canSwap).toBe(true);
    expect(view.canDiscardDrawn).toBe(true);
    expect(view.canDraw).toBe(false);
  });

  it("keeps drawn card face-up for the turn holder after reconnect", () => {
    const state = playingState();
    const drawn = card("K", "spades");
    state.drawnCard = drawn;
    state.drawnFromDiscard = true;
    state.turnStarted = true;

    handleMessage(state, "alice", {
      type: "join",
      playerId: "alice",
      name: "Alice",
    });

    const aliceView = buildPlayerView(state, "alice");
    const bobView = buildPlayerView(state, "bob");

    expect(aliceView.drawnCard).toEqual(drawn);
    expect(aliceView.drawnFromDiscard).toBe(true);
    expect(aliceView.canSwap).toBe(true);
    expect(aliceView.canDiscardDrawn).toBe(false);

    expect(bobView.drawnCard).toBeNull();
    expect(bobView.hasDrawnCard).toBe(true);
    expect(bobView.canSwap).toBe(false);
  });

  it("still allows swap/discard after reconnect when a drawn card is pending", () => {
    const state = playingState();
    state.deck.push(card("6", "clubs"));
    handleMessage(state, "alice", { type: "draw", source: "deck" });
    expect(state.drawnCard?.rank).toBe("6");

    state.players[0].connected = false;
    handleMessage(state, "alice", {
      type: "join",
      playerId: "alice",
      name: "Alice",
    });

    const discard = handleMessage(state, "alice", { type: "discard_drawn" });
    expect(discard).toEqual({});
    expect(state.drawnCard).toBeNull();
  });
});
