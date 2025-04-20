import type { StageConfig } from "boardgame.io";
import type { CambioState, PluginState } from "./state";

export const draw: StageConfig<CambioState, PluginState> = {
  moves: {
    drawFromDeck: ({ G }) => {
      const active = G.deck[0];
      return { ...G, deck: G.deck.slice(1), active };
    },

    drawFromDiscard: ({ G }) => {
      const active = G.discard[0];
      return { ...G, discard: G.discard.slice(1), active };
    },
  },

  next: "play",
};

export const play: StageConfig<CambioState, PluginState> = {
  moves: {
    playCard: ({ G }) => {
      return { ...G, discard: [G.active!, ...G.discard] };
    },

    swapCard: ({ G, player }, card: number) => {
      const hand = player.get().hand.toSpliced(card, 1, G.active!);
      player.set({ hand });
      return { ...G, active: undefined };
    },
  },
};
