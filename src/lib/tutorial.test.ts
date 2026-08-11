import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  isGameTutorialSeen,
  isHomeTutorialSeen,
  markGameTutorialSeen,
  markHomeTutorialSeen,
  resetAllTutorialSeen,
  TUTORIAL_GAME_SEEN_KEY,
  TUTORIAL_HOME_SEEN_KEY,
} from "./tutorial";

function createMemoryStorage(): Storage {
  const map = new Map<string, string>();
  return {
    get length() {
      return map.size;
    },
    clear() {
      map.clear();
    },
    getItem(key: string) {
      return map.get(key) ?? null;
    },
    key(index: number) {
      return [...map.keys()][index] ?? null;
    },
    removeItem(key: string) {
      map.delete(key);
    },
    setItem(key: string, value: string) {
      map.set(key, value);
    },
  };
}

beforeEach(() => {
  const storage = createMemoryStorage();
  vi.stubGlobal("localStorage", storage);
  vi.stubGlobal("window", { localStorage: storage });
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("tutorial persistence", () => {
  it("defaults to not seen", () => {
    expect(isHomeTutorialSeen()).toBe(false);
    expect(isGameTutorialSeen()).toBe(false);
  });

  it("persists seen flags across reads", () => {
    markHomeTutorialSeen();
    markGameTutorialSeen();
    expect(localStorage.getItem(TUTORIAL_HOME_SEEN_KEY)).toBe("1");
    expect(localStorage.getItem(TUTORIAL_GAME_SEEN_KEY)).toBe("1");
    expect(isHomeTutorialSeen()).toBe(true);
    expect(isGameTutorialSeen()).toBe(true);
  });

  it("reset clears seen flags", () => {
    markHomeTutorialSeen();
    markGameTutorialSeen();
    resetAllTutorialSeen();
    expect(isHomeTutorialSeen()).toBe(false);
    expect(isGameTutorialSeen()).toBe(false);
  });
});
