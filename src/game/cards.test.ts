import { describe, expect, it } from "vitest";
import {
  cardPoints,
  clampCardPointValue,
  normalizeCardPointValues,
} from "./cards";
import type { Card } from "./types";
import { DEFAULT_CARD_POINTS } from "./types";

function card(rank: Card["rank"], suit: Card["suit"] = "clubs"): Card {
  return { id: `${rank}-${suit}`, rank, suit };
}

describe("cardPoints", () => {
  it("uses default values when no config is passed", () => {
    expect(cardPoints(card("A"))).toBe(1);
    expect(cardPoints(card("J"))).toBe(10);
    expect(cardPoints(card("Q"))).toBe(10);
    expect(cardPoints(card("K", "spades"))).toBe(-2);
    expect(cardPoints(card("K", "hearts"))).toBe(25);
    expect(cardPoints(card("JOKER", "joker"))).toBe(0);
    expect(cardPoints(card("7"))).toBe(7);
  });

  it("uses room-configured values", () => {
    const values = {
      ace: 2,
      face: 5,
      joker: 3,
      blackKing: 0,
      redKing: 15,
    };
    expect(cardPoints(card("A"), values)).toBe(2);
    expect(cardPoints(card("J"), values)).toBe(5);
    expect(cardPoints(card("K", "clubs"), values)).toBe(0);
    expect(cardPoints(card("K", "diamonds"), values)).toBe(15);
    expect(cardPoints(card("JOKER", "joker"), values)).toBe(3);
  });
});

describe("normalizeCardPointValues", () => {
  it("fills missing fields with defaults", () => {
    expect(normalizeCardPointValues({ redKing: 20 })).toEqual({
      ...DEFAULT_CARD_POINTS,
      redKing: 20,
    });
  });

  it("clamps values to the allowed range", () => {
    expect(normalizeCardPointValues({ ace: -99, face: 99 })).toEqual({
      ...DEFAULT_CARD_POINTS,
      ace: -5,
      face: 25,
    });
  });
});

describe("clampCardPointValue", () => {
  it("clamps to min and max", () => {
    expect(clampCardPointValue(-10)).toBe(-5);
    expect(clampCardPointValue(30)).toBe(25);
    expect(clampCardPointValue(12)).toBe(12);
  });
});
