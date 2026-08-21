import { describe, expect, it } from "vitest";
import {
  parseTutorialPrefsPersistBlob,
  parseTutorialPrefsPersistJson,
} from "./tutorial-prefs-schema";

describe("tutorial-prefs-schema persist blob", () => {
  it("parses zustand persist blobs", () => {
    expect(
      parseTutorialPrefsPersistBlob({
        state: { homeSeen: true, gameSeen: false },
        version: 0,
      }),
    ).toEqual({ homeSeen: true, gameSeen: false });
  });

  it("rejects blobs without state", () => {
    expect(parseTutorialPrefsPersistBlob({ version: 0 })).toBeNull();
    expect(parseTutorialPrefsPersistJson('{"version":0}')).toBeNull();
  });

  it("ignores unknown fields via passthrough", () => {
    expect(
      parseTutorialPrefsPersistBlob({
        state: { homeSeen: true, extra: "kept" },
      }),
    ).toEqual({ homeSeen: true, extra: "kept" });
  });
});
