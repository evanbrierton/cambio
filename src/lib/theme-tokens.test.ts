import { describe, expect, it } from "vitest";
import { getThemeColorTokens } from "./theme-tokens";

describe("theme-tokens", () => {
  it("produces distinct palettes for retro and casino", () => {
    const retro = getThemeColorTokens("retro", "dark");
    const casino = getThemeColorTokens("casino", "dark");
    expect(retro.background).not.toBe(casino.background);
    expect(retro.accent).not.toBe(casino.accent);
    expect(retro.foreground).not.toBe(casino.foreground);
  });

  it("switches appearance for the same theme", () => {
    const dark = getThemeColorTokens("minimal", "dark");
    const light = getThemeColorTokens("minimal", "light");
    expect(dark.background).not.toBe(light.background);
    expect(dark.foreground).not.toBe(light.foreground);
  });
});
