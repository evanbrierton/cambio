import type { Ctx } from "boardgame.io";
import type { CambioState, PlayerState } from "./state";

export const getCurrentPlayer = (G: CambioState, ctx: Ctx): PlayerState => {
  const player = G.players[ctx.currentPlayer];

  if (!player) {
    throw new Error(`Player ${ctx.currentPlayer} not found`);
  }

  return player;
};
