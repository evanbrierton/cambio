import type { Game } from "boardgame.io";
import type { CambioState, PlayerState, PluginState } from "./state";
import { initialiseDeck } from "@/types";
import { PluginPlayer } from "boardgame.io/plugins";
import { setup } from "./phases";
import { draw, play } from "./stages";

const playerSetup = (): PlayerState => ({
  hand: [],
});

export const cambio: Game<CambioState, PluginState> = {
  name: "Cambio",
  minPlayers: 2,

  setup: ({ random }) => ({
    deck: random.Shuffle(initialiseDeck()),
    discard: [],
  }),

  phases: {
    setup,
  },

  turn: {
    stages: {
      draw,
      play,
    },
  },

  plugins: [
    PluginPlayer({
      setup: playerSetup,
    }),
  ],
};
