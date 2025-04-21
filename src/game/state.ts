import type { Card, Deck, Hand } from "@/game/card";
import type { PlayerID } from "boardgame.io";

export type CambioState = {
  deck: Deck
  discard: Deck
  active: Card | null
  players: Record<PlayerID, PlayerState>
  caller?: PlayerID
  remainingPeeks: number
  hasSwap: boolean
};

export type PlayerState = {
  id: PlayerID
  hand: Hand
};
