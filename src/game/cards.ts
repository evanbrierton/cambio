import { nanoid } from "nanoid";
import type { Card, Rank, Suit } from "./types";

const SUITS: Suit[] = ["hearts", "diamonds", "clubs", "spades"];
export const FULL_DECK_SIZE = 54;
const RANKS: Rank[] = [
  "2",
  "3",
  "4",
  "5",
  "6",
  "7",
  "8",
  "9",
  "10",
  "J",
  "Q",
  "K",
  "A",
];

export function createDeck(): Card[] {
  const cards: Card[] = [];

  for (const suit of SUITS) {
    for (const rank of RANKS) {
      cards.push({ id: nanoid(8), suit, rank });
    }
  }

  cards.push({ id: nanoid(8), suit: "joker", rank: "JOKER" });
  cards.push({ id: nanoid(8), suit: "joker", rank: "JOKER" });

  return shuffle(cards);
}

export function shuffle<T>(items: T[]): T[] {
  const deck = [...items];
  for (let i = deck.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck;
}

export function cardLabel(card: Card): string {
  if (card.rank === "JOKER") return "JK";
  return card.rank;
}

const SUIT_GLYPH: Record<Suit, string> = {
  hearts: "♥",
  diamonds: "♦",
  clubs: "♣",
  spades: "♠",
  joker: "★",
};

export function suitGlyph(suit: Suit): string {
  return SUIT_GLYPH[suit];
}

export function cardPoints(card: Card): number {
  if (card.rank === "JOKER") return 0;
  if (card.rank === "A") return 1;
  if (card.rank === "J" || card.rank === "Q") return 10;
  if (card.rank === "K") {
    if (card.suit === "hearts" || card.suit === "diamonds") return 25;
    return -2;
  }
  if (card.rank === "2") return 2;
  if (card.rank === "3") return 3;
  if (card.rank === "4") return 4;
  if (card.rank === "5") return 5;
  if (card.rank === "6") return 6;
  if (card.rank === "7") return 7;
  if (card.rank === "8") return 8;
  if (card.rank === "9") return 9;
  return 10;
}

export function cardsMatch(a: Card, b: Card): boolean {
  return a.rank === b.rank && a.suit === b.suit;
}

/** Snapping matches by rank (any suit). */
export function cardsSnapMatch(a: Card, b: Card): boolean {
  return a.rank === b.rank;
}

export function abilityForDiscard(card: Card): string | null {
  if (card.rank === "7" || card.rank === "8") return "peek_own";
  if (card.rank === "9" || card.rank === "10") return "spy";
  if (card.rank === "J") return "blind_switch";
  if (card.rank === "Q") return "queen_look";
  if (card.rank === "K") return "king_look";
  return null;
}

export function isRed(card: Card): boolean {
  return card.suit === "hearts" || card.suit === "diamonds";
}
