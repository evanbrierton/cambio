import type { Game, PlayerID } from "boardgame.io";
import type { CambioState, PlayerState } from "./state";
import { initializeDeck } from "@/game/card";
import { getCurrentPlayer } from "./players";
import { dismissStage, donateStage, drawStage, peekAnyStage, peekOpponentStage, peekSelfStage, playStage, snapStage, swapStage } from "./stages";

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
      peeksRemaining: 0,
      hasSwap: false,
      snapper: null,
      donateState: {
        donateQueue: [],
        beforeDonateStage: null,
      },
    };
  },

  turn: {
    onBegin: ({ G, ctx, events }) => {
      const player = getCurrentPlayer(G, ctx);

      if (G.caller === player.id) {
        events.endGame();
      }
    },

    activePlayers: { currentPlayer: "drawStage", others: "snapStage" },

    stages: {
      drawStage,
      playStage,
      dismissStage,
      peekSelfStage,
      peekOpponentStage,
      peekAnyStage,
      swapStage,
      snapStage,
      donateStage,
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
