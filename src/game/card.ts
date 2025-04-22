import type { PlayerID } from "boardgame.io";

const ranks = ["2", "3", "4", "5", "6", "7", "8", "9", "10", "jack", "queen", "king", "ace"] as const;
type Rank = typeof ranks[number];

type Color = "red" | "black" | "transparent";

type CardId = `${Rank}_${"hearts" | "diamonds" | "clubs" | "spades"}` | `joker_${Color}` | "empty";

export type Card = { id: CardId, value: number, source?: CardSource, coordinates?: CardCoordinates } & (
  | { rank: Rank, suit: "hearts" | "diamonds", color: "red" }
  | { rank: Rank, suit: "clubs" | "spades", color: "black" }
  | { rank: "joker", color: "red" | "black" }
  | { rank: "empty", color: "transparent" }
);

export type CardSource = "deck" | "discard";

export type CardWithCoordinates = Card & {
  coordinates: CardCoordinates
};

export type CardCoordinates = {
  player: PlayerID
  position: number
};

export const stringifyCoordinates = ({ player, position }: CardCoordinates): string => {
  return `${player}_${position}`;
};

export const parseCoordinates = (coordinates: string): CardCoordinates => {
  const [player, position] = coordinates.split("_");
  return { player: player as PlayerID, position: Number(position) };
};

export type Deck = Card[];
export type Hand = Record<number, CardWithCoordinates>;

export const EMPTY_CARD: Card = {
  id: "empty" as const,
  value: 0,
  rank: "empty",
  color: "transparent",
};

const getValue = ({ rank, color }: Omit<Card, "value">): number => {
  switch (rank) {
    case "empty": return 0;
    case "joker": return 0;
    case "ace": return 1;
    case "2": return 2;
    case "3": return 3;
    case "4": return 4;
    case "5": return 5;
    case "6": return 6;
    case "7": return 7;
    case "8": return 8;
    case "9": return 9;
    case "10": return 10;
    case "jack": return 10;
    case "queen": return 10;
    case "king":
      if (color === "red")
        return 25;
      return -2;
  }
};

export const initializeDeck = (): Deck => {
  const reds = (["hearts", "diamonds"] as const).flatMap(
    suit => ranks.map(rank => ({ id: `${rank}_${suit}` as const, rank, suit, color: "red" as const })),
  );

  const blacks = (["clubs", "spades"] as const).flatMap(
    suit => ranks.map(rank => ({ id: `${rank}_${suit}` as const, rank, suit, color: "black" as const })),
  );

  const jokers = (["red", "black"] as const).map(color => ({ id: `joker_${color}` as const, rank: "joker" as const, color }));

  return [...reds, ...blacks, ...jokers].map(card => ({ ...card, value: getValue(card) }));
};
