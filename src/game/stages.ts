import type { StageConfig } from "boardgame.io";
import type { CambioState } from "./state";
import { callCambio, dismiss, donate, drawFromDeck, drawFromDiscard, peekAny, peekOpponent, peekSelf, playCard, snap, swapCards, takeCard } from "./moves";

export const drawStage: StageConfig<CambioState> = {
  moves: {
    drawFromDeck,
    drawFromDiscard,
    callCambio,
    snap,
  },

  next: "playStage",
};

export const playStage: StageConfig<CambioState> = {
  moves: {
    playCard,
    takeCard,
    snap,
  },

  next: "snapStage",
};

export const dismissStage: StageConfig<CambioState> = {
  moves: { dismiss, snap },

  next: "snapStage",
};

export const peekSelfStage: StageConfig<CambioState> = {
  moves: {
    peekSelf,
    snap,
  },

  next: "dismissStage",
};

export const peekOpponentStage: StageConfig<CambioState> = {
  moves: {
    peekOpponent,
    snap,
  },

  next: "dismissStage",
};

export const peekAnyStage: StageConfig<CambioState> = {
  moves: {
    peekAny,
    snap,
  },

  next: "dismissStage",
};

export const swapStage: StageConfig<CambioState> = {
  moves: {
    swapCards,
    snap,
  },

  next: "snapStage",
};

export const snapStage: StageConfig<CambioState> = {
  moves: {
    snap,
  },
};

export const donateStage: StageConfig<CambioState> = {
  moves: {
    snap,
    donate,
  },
};
