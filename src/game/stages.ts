import type { StageConfig } from "boardgame.io";
import type { CambioState } from "./state";
import { callCambio, dismiss, drawFromDeck, drawFromDiscard, peekAny, peekOpponent, peekSelf, playCard, swapCards, takeCard } from "./moves";

export const initialDrawStage: StageConfig<CambioState> = {
  moves: {
    drawFromDeck,
    drawFromDiscard,
  },
  next: "drawStage",
};

export const drawStage: StageConfig<CambioState> = {

  moves: {
    drawFromDeck,
    drawFromDiscard,
    callCambio,
  },

  next: "playStage",
};

export const playStage: StageConfig<CambioState> = {
  moves: {
    playCard,
    takeCard,
  },
};

export const dismissStage: StageConfig<CambioState> = {
  moves: { dismiss },
};

export const peekSelfStage: StageConfig<CambioState> = {
  moves: {
    peekSelf,
  },

  next: "dismissStage",
};

export const peekOpponentStage: StageConfig<CambioState> = {
  moves: {
    peekOpponent,
  },

  next: "dismissStage",
};

export const peekAnyStage: StageConfig<CambioState> = {
  moves: {
    peekAny,
  },
  next: "dismissStage",
};

export const swapStage: StageConfig<CambioState> = {
  moves: {
    swapCards,
  },
};
