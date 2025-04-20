import type { Card, Deck, Hand } from "@/types";
import type { PlayerID } from "boardgame.io";

export type CambioState = {
  deck: Deck
  discard: Deck
  active?: Card
  players: Record<PlayerID, PlayerState>
  caller?: PlayerID
};

export type PlayerState = {
  id: PlayerID
  hand: Hand
};
