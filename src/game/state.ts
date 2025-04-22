import type { Card, CardCoordinates, Deck, Hand } from "@/game/card";
import type { PlayerID } from "boardgame.io";

export type CambioState = {
  deck: Deck
  discard: Deck
  active: Card | null
  players: Record<PlayerID, PlayerState>
  caller?: PlayerID
  snapper: PlayerID | null
  peeksRemaining: number
  hasSwap: boolean
  donateState: DonateState
};

export type DonateState = {
  donateQueue: CardCoordinates[]
  beforeDonateStage: string | null
};

export type PlayerState = {
  id: PlayerID
  hand: Hand
};
