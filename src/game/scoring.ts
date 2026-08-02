import { cardPoints } from "./cards";
import type { GameState } from "./types";

export function scorePlayer(state: GameState, playerId: string): number {
  const player = state.players.find((p) => p.id === playerId);
  if (!player) return 0;

  let total = 0;
  for (const slot of player.hand) {
    if (slot.card) total += cardPoints(slot.card);
  }
  return total;
}

export function computeScores(state: GameState): Record<string, number> {
  const scores: Record<string, number> = {};
  for (const player of state.players) {
    scores[player.id] = scorePlayer(state, player.id);
  }
  return scores;
}

export function determineWinners(state: GameState): string[] {
  const scores = state.scores ?? computeScores(state);
  const entries = Object.entries(scores);
  const minScore = Math.min(...entries.map(([, s]) => s));
  const tied = entries.filter(([, s]) => s === minScore).map(([id]) => id);

  if (tied.length === 1) return tied;

  // On a draw, the Cambio caller ranks lower; other tied players share the win.
  const nonCallers = tied.filter((id) => id !== state.cambioCallerId);
  return nonCallers.length > 0 ? nonCallers : tied;
}
