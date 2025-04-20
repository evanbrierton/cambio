import type { Card, Deck, Hand } from "@/types";
import type { PlayerPlugin } from "boardgame.io/plugins";

export type CambioState = {
  deck: Deck
  discard: Deck
  active?: Card
};

export type PlayerState = {
  hand: Hand
};

export type PluginState = {
  [key: string]: unknown
} & PlayerPlugin<PlayerState>;
