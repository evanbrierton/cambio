import { describe, expect, it } from "vitest";
import {
  DEFAULT_PARTY_HOST,
  hasWorkerChanges,
  partyHostForWorker,
  previewWorkerName,
} from "./preview-worker.mjs";

describe("hasWorkerChanges", () => {
  it("is false for UI-only paths", () => {
    expect(
      hasWorkerChanges([
        "src/components/GameTable.tsx",
        "src/lib/themes.ts",
        "scripts/vercel-build.sh",
      ]),
    ).toBe(false);
  });

  it("is true for party, game, or wrangler changes", () => {
    expect(hasWorkerChanges(["party/cambio.ts"])).toBe(true);
    expect(hasWorkerChanges(["src/game/engine.ts"])).toBe(true);
    expect(hasWorkerChanges(["wrangler.toml"])).toBe(true);
  });
});

describe("previewWorkerName", () => {
  it("prefers the pull request id", () => {
    expect(
      previewWorkerName({
        prId: "155",
        branch: "evanbrierton/cam-79-paired-preview-worker-df0a",
      }),
    ).toBe("cambio-pr-155");
  });

  it("falls back to a sanitized branch slug", () => {
    expect(
      previewWorkerName({
        branch: "evanbrierton/cam-79-paired-preview-worker-df0a",
      }),
    ).toBe("cambio-pr-evanbrierton-cam-79-paired-preview-worke");
  });
});

describe("partyHostForWorker", () => {
  it("keeps the account workers.dev suffix from production", () => {
    expect(partyHostForWorker("cambio-pr-155", DEFAULT_PARTY_HOST)).toBe(
      "cambio-pr-155.brierton.workers.dev",
    );
  });
});
