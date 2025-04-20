import type { PhaseConfig } from "boardgame.io";
import type { CambioState, PluginState } from "./state";

export const setup: PhaseConfig<CambioState, PluginState> = {
  start: true,

  moves: {
    draw: ({ G, events, player }) => {
      const hand = G.deck.slice(0, 4);
      player.set({ hand });
      events.endTurn();
      events.setStage("draw");
      return ({ ...G, deck: G.deck.slice(4) });
    },
  },

  endIf: ({ player }) => {
    return Object.values(player.state).every(({ hand }) => hand.length === 4);
  },
};
