import { describe, expect, it } from "vitest";
import { THEME_OPTIONS, THEME_VOICES, type ThemeId } from "./themes";

const COACH_KEYS = [
  "coachHandTitle",
  "coachHandBody",
  "coachDeckTitle",
  "coachDeckBody",
  "coachDiscardTitle",
  "coachDiscardBody",
  "coachCambioTitle",
  "coachCambioBody",
  "coachSkip",
  "coachGotIt",
] as const;

describe("theme coach copy", () => {
  it("is present, short, and free of em dashes for every theme", () => {
    for (const { id } of THEME_OPTIONS) {
      const voice = THEME_VOICES[id];
      for (const key of COACH_KEYS) {
        const value = voice[key];
        expect(value.length, `${id}.${key}`).toBeGreaterThan(0);
        expect(value, `${id}.${key}`).not.toMatch(/[—–]/);
      }
    }
  });

  it("uses each theme's table nouns", () => {
    const cases: Record<
      ThemeId,
      { deck: string; discard: string; cambio: string }
    > = {
      retro: { deck: "DECK", discard: "DISCARD", cambio: "CALL CAMBIO" },
      casino: { deck: "shoe", discard: "muck", cambio: "Cambio" },
      party: { deck: "deck", discard: "Trash", cambio: "Cambio" },
      minimal: { deck: "Deck", discard: "Discard", cambio: "Cambio" },
      calm: { deck: "deck", discard: "discard", cambio: "Cambio" },
      library: { deck: "deck", discard: "discard", cambio: "book" },
      lodge: { deck: "deck", discard: "discard", cambio: "Cambio" },
      ink: { deck: "Deck", discard: "Discard", cambio: "Cambio" },
    };

    for (const id of Object.keys(cases) as ThemeId[]) {
      const voice = THEME_VOICES[id];
      const expected = cases[id];
      expect(voice.coachDeckTitle).toMatch(new RegExp(expected.deck, "i"));
      expect(`${voice.coachDiscardTitle} ${voice.coachDiscardBody}`).toMatch(
        new RegExp(expected.discard, "i"),
      );
      expect(voice.coachCambioTitle).toMatch(new RegExp(expected.cambio, "i"));
    }
  });
});
