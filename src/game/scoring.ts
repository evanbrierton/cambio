import { cardPoints } from "./cards";
import type { Card, GameState } from "./types";

export function scorePlayer(state: GameState, playerId: string): number {
  const player = state.players.find((p) => p.id === playerId);
  if (!player) return 0;

  let total = 0;
  for (const slot of player.hand) {
    total += cardPoints(slot.card);
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

  const caller = state.cambioCallerId;
  const nonCallers = tied.filter((id) => id !== caller);
  if (nonCallers.length === 1) return nonCallers;
  if (nonCallers.length > 1) {
    return pickLowestCardValueWinner(state, nonCallers);
  }

  return pickLowestCardValueWinner(state, tied);
}

function pickLowestCardValueWinner(
  state: GameState,
  candidates: string[],
): string[] {
  let bestIds: string[] = [];
  let bestValue = Infinity;

  for (const id of candidates) {
    const player = state.players.find((p) => p.id === id);
    if (!player) continue;
    const lowestCard = Math.min(...player.hand.map((s) => cardPoints(s.card)));
    if (lowestCard < bestValue) {
      bestValue = lowestCard;
      bestIds = [id];
    } else if (lowestCard === bestValue) {
      bestIds.push(id);
    }
  }

  return bestIds.length > 0 ? bestIds : candidates;
}
