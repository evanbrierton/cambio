import type { FnContext, LongFormMove, PlayerID } from "boardgame.io";
import type { Card, CardCoordinates, Deck } from "./card";
import type { CambioState } from "./state";
import { INVALID_MOVE } from "boardgame.io/core";
import { getCurrentPlayer } from "./players";

type TakeFirstArg<F> = F extends (x: infer X) => infer R ? (arg: X) => R : never;
type TrimVoidArg<F> = F extends (x: never, y: infer P) => unknown ? P extends void ? TakeFirstArg<F> : F : never;

type CustomMoveFn<G, T = void, PluginAPIs extends Record<string, unknown> = Record<string, unknown>> = TrimVoidArg<(context: FnContext<G, PluginAPIs> & {
  playerID: PlayerID
}, args: T) => void | G | typeof INVALID_MOVE>;

type CustomLongFormMove<G, T = void, PluginAPIs extends Record<string, unknown> = Record<string, unknown>> = Omit<LongFormMove, "move"> & {
  move: CustomMoveFn<G, T, PluginAPIs>
};

type Move<G, T = void, PluginAPIs extends Record<string, unknown> = Record<string, unknown>> = CustomMoveFn<G, T, PluginAPIs> | CustomLongFormMove<G, T, PluginAPIs>;

export const callCambio: Move<CambioState> = ({ G, ctx, events }) => {
  const caller = getCurrentPlayer(G, ctx).id;
  events.endTurn();

  return { ...G, caller };
};

export const drawFromDeck: Move<CambioState> = ({ G, events, random }) => {
  const active = G.deck[0];

  if (!active) {
    return INVALID_MOVE;
  }

  const updateDecks = (): { deck: Deck, discard: Deck } => {
    if (G.deck.length === 1) {
      return { deck: random.Shuffle(G.discard.slice(1)), discard: [G.discard[0]!] };
    }

    return { deck: G.deck.slice(1), discard: G.discard };
  };

  const { deck, discard } = updateDecks();

  events.endStage();

  return { ...G, deck, discard, active };
};

export const drawFromDiscard: Move<CambioState> = ({ G, events }) => {
  const active = G.discard[0];

  if (!active) {
    return INVALID_MOVE;
  }

  const discard = G.discard.slice(1);
  events.endStage();

  return { ...G, discard, active };
};

export const playCard: Move<CambioState> = ({ G, events }) => {
  if (!G.active) {
    return INVALID_MOVE;
  }

  const discard = [G.active, ...G.discard];

  type PeekConfig = {
    peeksRemaining: number
    hasSwap: boolean
  };

  const setNextStage = (active: Card): PeekConfig => {
    if (["7", "8"].includes(active.rank)) {
      events.setStage("peekSelfStage");
      return { peeksRemaining: 0, hasSwap: false };
    }

    if (["9", "10"].includes(active.rank)) {
      events.setStage("peekOpponentStage");
      return { peeksRemaining: 0, hasSwap: false };
    }

    if (active.rank === "jack") {
      events.setStage("swapStage");
      return { peeksRemaining: 0, hasSwap: true };
    }

    if (active.rank === "queen") {
      events.setStage("peekAnyStage");
      return { peeksRemaining: 0, hasSwap: true };
    }

    if (active.rank === "king") {
      events.setStage("dismissStage");
      return { peeksRemaining: 1, hasSwap: true };
    }

    events.endStage();
    events.endTurn();
    return { peeksRemaining: 0, hasSwap: false };
  };

  const peekConfig = setNextStage(G.active);
  return { ...G, active: null, discard, ...peekConfig };
};

export const dismiss: Move<CambioState> = ({ G, events }) => {
  if (G.remainingPeeks > 0) {
    events.setStage("peekAnyStage");
    return { ...G, remainingPeeks: G.remainingPeeks - 1, active: null };
  }

  if (G.hasSwap) {
    events.setStage("swapStage");
    return { ...G, hasSwap: false, active: null };
  }

  events.endStage();
  events.endTurn();

  return { ...G, active: null };
};

export const takeCard: Move<CambioState, CardCoordinates> = ({ G, ctx, events }, coordinates: CardCoordinates) => {
  if (coordinates.player !== ctx.currentPlayer) {
    return INVALID_MOVE;
  }

  const player = getCurrentPlayer(G, ctx);

  const { position } = coordinates;
  const card = player.hand[position];

  if (!card || !G.active) {
    return INVALID_MOVE;
  }

  const hand = { ...player.hand, [position]: { ...G.active, position } };

  const active = null;
  const players = { ...G.players, [player.id]: { ...player, hand } };

  const discard = [card, ...G.discard];

  events.endStage();
  events.endTurn();

  return { ...G, active, players, discard };
};

export const peekSelf: Move<CambioState, CardCoordinates> = ({ G, ctx, events }, coordinates: CardCoordinates) => {
  if (coordinates.player !== ctx.currentPlayer) {
    return INVALID_MOVE;
  }

  const player = getCurrentPlayer(G, ctx);
  const active = player.hand[coordinates.position];

  if (!active) {
    return INVALID_MOVE;
  }

  events.endStage();

  return { ...G, active };
};

export const peekOpponent: Move<CambioState, CardCoordinates> = ({ G, ctx, events }, coordinates: CardCoordinates) => {
  if (coordinates.player === ctx.currentPlayer) {
    return INVALID_MOVE;
  }

  const opponent = G.players[coordinates.player]!;
  const active = opponent.hand[coordinates.position];

  if (!active) {
    return INVALID_MOVE;
  }

  events.endStage();

  return { ...G, active };
};

export const peekAny: Move<CambioState, CardCoordinates> = ({ G, events }, coordinates: CardCoordinates) => {
  const active = G.players[coordinates.player]?.hand[coordinates.position];

  if (!active) {
    return INVALID_MOVE;
  }

  events.endStage();

  return { ...G, active };
};

export const swapCards: Move<CambioState, Set<CardCoordinates>> = ({ G, events }, coordinates) => {
  if (coordinates.size !== 2) {
    return INVALID_MOVE;
  }

  const [coordinates1, coordinates2] = Array.from(coordinates);

  if (!coordinates1 || !coordinates2) {
    return INVALID_MOVE;
  }

  const player1 = G.players[coordinates1.player];
  const player2 = G.players[coordinates2.player];

  if (!player1 || !player2) {
    return INVALID_MOVE;
  }

  const card1 = player1.hand[coordinates1.position];
  const card2 = player2.hand[coordinates2.position];

  if (!card1 || !card2) {
    return INVALID_MOVE;
  }

  const hand1 = { ...player1.hand, [coordinates1.position]: card2 };
  const hand2 = { ...player2.hand, [coordinates2.position]: card1 };

  const players = {
    ...G.players,
    [coordinates1.player]: { ...player1, hand: hand1 },
    [coordinates2.player]: { ...player2, hand: hand2 },
  };

  events.endStage();
  events.endTurn();

  return { ...G, players };
};

export const MOVES = {
  callCambio,
  drawFromDeck,
  drawFromDiscard,
  playCard,
  takeCard,
  dismiss,
  peekSelf,
  peekOpponent,
  peekAny,
  swapCards,
};

type OmitFirstArg<F> = F extends (x: never, ...args: infer P) => infer R ? (...args: P) => R : never;

type VoidReturn<F> = F extends (...args: infer P) => void ? (...args: P) => void : never;

export type Moves = {
  [K in keyof typeof MOVES]: VoidReturn<OmitFirstArg<typeof MOVES[K]>>;
};
