import { describe, expect, it } from "vitest";
import {
  readAppearancePref,
  readThemePref,
  writeAppearancePref,
  writeThemePref,
} from "./theme-prefs";
import type { StorageAdapter } from "./types";

function createMemoryStorage(): StorageAdapter {
  const map = new Map<string, string>();
  return {
    getItem(key) {
      return map.get(key) ?? null;
    },
    setItem(key, value) {
      map.set(key, value);
    },
    removeItem(key) {
      map.delete(key);
    },
  };
}

describe("theme-prefs", () => {
  it("persists theme and appearance preferences", () => {
    const storage = createMemoryStorage();
    writeThemePref(storage, "casino");
    writeAppearancePref(storage, "light");
    expect(readThemePref(storage)).toBe("casino");
    expect(readAppearancePref(storage)).toBe("light");
  });

  it("falls back when stored values are invalid", () => {
    const storage = createMemoryStorage();
    storage.setItem("cambio-theme", "not-a-theme");
    storage.setItem("cambio-appearance", "auto");
    expect(readThemePref(storage, "party")).toBe("party");
    expect(readAppearancePref(storage, "dark")).toBe("dark");
  });
});
