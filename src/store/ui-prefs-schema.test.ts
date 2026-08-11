import { describe, expect, it } from "vitest";
import {
  parseUiPrefsPersistBlob,
  parseUiPrefsPersistJson,
} from "./ui-prefs-schema";

describe("ui-prefs-schema persist blob", () => {
  it("parses zustand persist blobs", () => {
    expect(
      parseUiPrefsPersistBlob({
        state: { soundEnabled: false, botCount: 4 },
        version: 0,
      }),
    ).toEqual({ soundEnabled: false, botCount: 4 });
  });

  it("rejects blobs without state", () => {
    expect(parseUiPrefsPersistBlob({ version: 0 })).toBeNull();
    expect(parseUiPrefsPersistJson('{"version":0}')).toBeNull();
  });

  it("ignores unknown fields via passthrough", () => {
    expect(
      parseUiPrefsPersistBlob({
        state: { hintsEnabled: true, extra: "kept" },
      }),
    ).toEqual({ hintsEnabled: true, extra: "kept" });
  });
});
