const ranks = ["2", "3", "4", "5", "6", "7", "8", "9", "10", "jack", "queen", "king", "ace"] as const;
const colors = ["red", "black"] as const;

type Rank = typeof ranks[number];
type Color = typeof colors[number];

type CardId = `${Rank}_${"hearts" | "diamonds" | "clubs" | "spades"}` | `joker_${Color}`;

export type Card = { id: CardId, value: number } & (
  | { rank: Rank, suit: "hearts" | "diamonds", color: "red" }
  | { rank: Rank, suit: "clubs" | "spades", color: "black" }
  | { rank: "joker", color: Color }
);

export type CardWithPosition = Card & {
  position: number;
};

export type Deck = Card[];
export type Hand = CardWithPosition[];

const getValue = ({ rank, color }: Omit<Card, "value">): number => {
  switch (rank) {
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

  const jokers = colors.map(color => ({ id: `joker_${color}` as const, rank: "joker" as const, color }));

  return [...reds, ...blacks, ...jokers].map(card => ({ ...card, value: getValue(card) }));
};
