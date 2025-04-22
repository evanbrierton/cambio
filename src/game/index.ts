import type { Game, PlayerID } from "boardgame.io";
import type { CambioState, PlayerState } from "./state";
import { initializeDeck } from "@/game/card";
import { getCurrentPlayer } from "./players";
import { dismissStage, drawStage, peekAnyStage, peekOpponentStage, peekSelfStage, playStage, swapStage } from "./stages";

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
          hand: deck.splice(0, 4).map((card, position) => ({ ...card, coordinates: { position, player: id } })),
        },
      };
    }, {});

    return {
      deck,
      players,
      discard: [],
      active: null,
      remainingPeeks: 0,
      hasSwap: false,
    };
  },

  turn: {
    onBegin: ({ G, ctx, events }) => {
      const player = getCurrentPlayer(G, ctx);

      if (G.caller === player.id) {
        events.endGame();
      }
    },

    activePlayers: { currentPlayer: "drawStage" },

    stages: {
      drawStage,
      playStage,
      dismissStage,
      peekSelfStage,
      peekOpponentStage,
      peekAnyStage,
      swapStage,
    },
  },

  playerView: ({ G, ctx, playerID }) => {
    const currentPlayer = ctx.currentPlayer === playerID;

    return {
      ...G,
      active: currentPlayer ? G.active : undefined,
    };
  },
};
