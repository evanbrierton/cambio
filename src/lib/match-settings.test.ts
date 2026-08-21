import { describe, expect, it } from "vitest";
import { parseMatchSettings, parseMatchSettingsJson } from "./match-settings";

describe("match-settings", () => {
  it("parses valid match settings", () => {
    expect(parseMatchSettings({ targetSize: 3, fillWithBots: false })).toEqual({
      targetSize: 3,
      fillWithBots: false,
    });
  });

  it("clamps target size and defaults fillWithBots", () => {
    expect(parseMatchSettings({ targetSize: 99 })).toEqual({
      targetSize: 6,
      fillWithBots: true,
    });
    expect(parseMatchSettings({ fillWithBots: false })).toEqual({
      targetSize: 4,
      fillWithBots: false,
    });
  });

  it("falls back on invalid JSON and shapes", () => {
    expect(parseMatchSettingsJson("{")).toEqual({
      targetSize: 4,
      fillWithBots: true,
    });
    expect(parseMatchSettings({ targetSize: "four" })).toEqual({
      targetSize: 4,
      fillWithBots: true,
    });
  });
});
