import { describe, expect, it } from "vitest";
import { botThinkDelay } from "../src/game/bot";
import type { BotDifficulty } from "../src/game/types";

const DIFFS: BotDifficulty[] = ["easy", "medium", "hard"];

describe("CAM-12 pacing: botThinkDelay distribution", () => {
  for (const diff of DIFFS) {
    it(`produces human-like, randomized delays for ${diff}`, () => {
      const samples = Array.from({ length: 2000 }, () => botThinkDelay(diff));
      const min = Math.min(...samples);
      const max = Math.max(...samples);
      const mean = samples.reduce((a, b) => a + b, 0) / samples.length;
      const distinct = new Set(samples).size;

      // eslint-disable-next-line no-console
      console.log(
        `[${diff}] n=${samples.length} min=${min}ms max=${max}ms mean=${mean.toFixed(
          0,
        )}ms distinctValues=${distinct}`,
      );

      // Human-like: not near-instant. At least several hundred ms floor.
      expect(min).toBeGreaterThanOrEqual(500);
      // Randomized: many distinct values, not a constant.
      expect(distinct).toBeGreaterThan(200);
      // Upper bound sane (< ~4s including hesitation)
      expect(max).toBeLessThan(4000);
    });
  }

  it("scales by difficulty (easier = slower on average)", () => {
    const meanOf = (d: BotDifficulty) => {
      const s = Array.from({ length: 5000 }, () => botThinkDelay(d));
      return s.reduce((a, b) => a + b, 0) / s.length;
    };
    const easy = meanOf("easy");
    const medium = meanOf("medium");
    const hard = meanOf("hard");
    // eslint-disable-next-line no-console
    console.log(
      `means: easy=${easy.toFixed(0)}ms medium=${medium.toFixed(
        0,
      )}ms hard=${hard.toFixed(0)}ms`,
    );
    expect(easy).toBeGreaterThan(medium);
    expect(medium).toBeGreaterThan(hard);
  });
});
