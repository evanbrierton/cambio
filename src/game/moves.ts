import type { Move } from "boardgame.io";
import type { CambioState } from "./state";

export const callCambio: Move<CambioState> = ({ G, ctx, events }) => {
  const caller = G.players[ctx.currentPlayer].id;
  events.endTurn();

  return { ...G, caller };
};

export const drawFromDeck: Move<CambioState> = ({ G, events }) => {
  const active = G.deck[0];
  const deck = G.deck.slice(1);
  events.endStage();

  return { ...G, deck, active };
};

export const drawFromDiscard: Move<CambioState> = ({ G, events }) => {
  const active = G.discard[0];
  const discard = G.discard.slice(1);
  events.endStage();

  return { ...G, discard, active };
};

export const playCard: Move<CambioState> = ({ G, events }) => {
  const active = undefined;
  const discard = [...G.discard, G.active!];

  events.endStage();
  events.endTurn();

  return { ...G, active, discard };
};

export const swapCard: Move<CambioState> = ({ G, ctx, events }, card: number) => {
  const player = G.players[ctx.currentPlayer];

  const position = player.hand[card].position;
  const hand = player.hand.toSpliced(card, 1, { ...G.active!, position });

  const active = undefined;
  const players = { ...G.players, [player.id]: { ...player, hand } };
  const discard = [...G.discard, G.active!];

  events.endStage();
  events.endTurn();

  return { ...G, active, players, discard };
};
