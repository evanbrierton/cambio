import { describe, expect, it } from "vitest";
import {
  parseLegacyBotSettings,
  parseLegacyBotSettingsJson,
} from "./bot-settings";

describe("bot-settings schema", () => {
  it("parses valid legacy bot settings", () => {
    expect(parseLegacyBotSettings({ botCount: 3, difficulty: "hard" })).toEqual(
      {
        botCount: 3,
        difficulty: "hard",
      },
    );
  });

  it("clamps invalid bot counts and defaults difficulty", () => {
    expect(parseLegacyBotSettings({ botCount: 99 })).toEqual({
      botCount: 5,
      difficulty: "easy",
    });
    expect(parseLegacyBotSettings({ difficulty: "medium" })).toEqual({
      botCount: 2,
      difficulty: "medium",
    });
  });

  it("falls back on invalid JSON and shapes", () => {
    expect(parseLegacyBotSettingsJson("{")).toEqual({
      botCount: 2,
      difficulty: "easy",
    });
    expect(parseLegacyBotSettings({ botCount: "two" })).toEqual({
      botCount: 2,
      difficulty: "easy",
    });
  });
});
