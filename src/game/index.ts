import type { Game, PlayerID } from "boardgame.io";
import type { CambioState, PlayerState } from "./state";
import { initializeDeck } from "@/types";
import { draw, play } from "./stages";

export const cambio: Game<CambioState> = {
  name: "Cambio",
  minPlayers: 2,

  setup: ({ ctx, random }) => {
    const deck = random.Shuffle(initializeDeck());

    const players = ctx.playOrder.reduce<Record<PlayerID, PlayerState>>((acc, id) => {
      return {
        ...acc,
        [id]: {
          id,
          hand: deck.splice(0, 4).map((card, position) => ({ ...card, position })),
        },
      };
    }, {});

    return {
      deck,
      players,
      discard: [],
      active: undefined,
    };
  },

  turn: {
    onBegin: ({ G, ctx, events }) => {
      const player = G.players[ctx.currentPlayer];

      if (G.caller === player.id) {
        events.endGame();
      }
    },

    activePlayers: { currentPlayer: "draw" },

    stages: {
      draw,
      play,
    },
  },
};
