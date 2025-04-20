import type { StageConfig } from "boardgame.io";
import type { CambioState } from "./state";
import { drawFromDeck, drawFromDiscard, playCard, swapCard } from "./moves";

export const draw: StageConfig<CambioState> = {

  moves: {
    drawFromDeck,
    drawFromDiscard,
  },

  next: "play",
};

export const play: StageConfig<CambioState> = {
  moves: {
    playCard,
    swapCard,
  },
};
