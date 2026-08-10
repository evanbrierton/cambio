import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * CAM-75 verifier: ensure swap/draw sound implementations are distinct and
 * wired to separate WS flash handlers (not log-string draw playback).
 */
describe("CAM-75 sound differentiation", () => {
  const soundsSrc = readFileSync(
    join(process.cwd(), "src/lib/sounds.ts"),
    "utf8",
  );
  const connectionSrc = readFileSync(
    join(process.cwd(), "src/hooks/useGameConnection.ts"),
    "utf8",
  );
  const useGameSoundsSrc = readFileSync(
    join(process.cwd(), "src/hooks/useGameSounds.ts"),
    "utf8",
  );

  it("defines separate deckDraw, discardDraw, reshuffle, and swap sound cases", () => {
    expect(soundsSrc).toMatch(/case "deckDraw":/);
    expect(soundsSrc).toMatch(/case "discardDraw":/);
    expect(soundsSrc).toMatch(/case "reshuffle":/);
    expect(soundsSrc).toMatch(/case "swap":/);
    expect(soundsSrc).not.toMatch(/case "draw":/);
  });

  it("uses distinct tone signatures for swap vs deck draw", () => {
    const extractCase = (id: string) => {
      const match = soundsSrc.match(
        new RegExp(`case "${id}":([\\s\\S]*?)(?=\\n    case |\\n  \\})`),
      );
      expect(match, `missing case ${id}`).toBeTruthy();
      return match![1];
    };

    const deckDraw = extractCase("deckDraw");
    const swap = extractCase("swap");

    expect(deckDraw).not.toEqual(swap);
    expect(swap).toMatch(/880/);
    expect(swap).toMatch(/220/);
    expect(deckDraw).toMatch(/620/);
    expect(deckDraw).toMatch(/740/);
  });

  it("plays draw-family sounds from WS flash events in useGameConnection", () => {
    expect(connectionSrc).toMatch(/data\.type === "swap_flash"/);
    expect(connectionSrc).toMatch(/playSound\("swap"\)/);
    expect(connectionSrc).toMatch(/data\.type === "deck_draw_flash"/);
    expect(connectionSrc).toMatch(/playSound\("deckDraw"\)/);
    expect(connectionSrc).toMatch(/data\.type === "discard_draw_flash"/);
    expect(connectionSrc).toMatch(/playSound\("discardDraw"\)/);
    expect(connectionSrc).toMatch(/data\.type === "reshuffle_flash"/);
    expect(connectionSrc).toMatch(/playSound\("reshuffle"\)/);
  });

  it("does not play draw/swap sounds from log strings in useGameSounds", () => {
    expect(useGameSoundsSrc).not.toMatch(/playSound\("draw"\)/);
    expect(useGameSoundsSrc).not.toMatch(/playSound\("deckDraw"\)/);
    expect(useGameSoundsSrc).not.toMatch(/playSound\("discardDraw"\)/);
    expect(useGameSoundsSrc).not.toMatch(/playSound\("swap"\)/);
    expect(useGameSoundsSrc).not.toMatch(/playSound\("reshuffle"\)/);
  });
});
