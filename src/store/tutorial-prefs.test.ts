import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { parseTutorialPrefsPersistJson } from "./tutorial-prefs-schema";

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

type TutorialPrefsModule = typeof import("./tutorial-prefs");

let tutorialPrefsModule: TutorialPrefsModule;

beforeEach(async () => {
  vi.resetModules();
  const storage = createMemoryStorage();
  vi.stubGlobal("localStorage", storage);
  vi.stubGlobal("window", { localStorage: storage });
  tutorialPrefsModule = await import("./tutorial-prefs");
  tutorialPrefsModule.useTutorialStore.setState({
    homeSeen: false,
    gameSeen: false,
  });
  await tutorialPrefsModule.useTutorialStore.persist.clearStorage();
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("tutorial prefs store", () => {
  it("defaults to not seen", () => {
    expect(tutorialPrefsModule.useTutorialStore.getState().homeSeen).toBe(
      false,
    );
    expect(tutorialPrefsModule.useTutorialStore.getState().gameSeen).toBe(
      false,
    );
  });

  it("persists seen flags across rehydration", async () => {
    tutorialPrefsModule.useTutorialStore.getState().markHomeSeen();
    tutorialPrefsModule.useTutorialStore.getState().markGameSeen();

    const raw = localStorage.getItem(
      tutorialPrefsModule.TUTORIAL_PREFS_STORAGE_KEY,
    );
    expect(raw).not.toBeNull();
    if (raw === null) {
      throw new Error("expected tutorial prefs to be persisted");
    }
    expect(parseTutorialPrefsPersistJson(raw)).toEqual({
      homeSeen: true,
      gameSeen: true,
    });

    vi.resetModules();
    const reloaded = await import("./tutorial-prefs");
    await reloaded.useTutorialStore.persist.rehydrate();

    expect(reloaded.useTutorialStore.getState().homeSeen).toBe(true);
    expect(reloaded.useTutorialStore.getState().gameSeen).toBe(true);
  });

  it("reset clears seen flags", async () => {
    tutorialPrefsModule.useTutorialStore.getState().markHomeSeen();
    tutorialPrefsModule.useTutorialStore.getState().markGameSeen();
    tutorialPrefsModule.useTutorialStore.getState().resetAll();

    expect(tutorialPrefsModule.useTutorialStore.getState().homeSeen).toBe(
      false,
    );
    expect(tutorialPrefsModule.useTutorialStore.getState().gameSeen).toBe(
      false,
    );

    await tutorialPrefsModule.useTutorialStore.persist.rehydrate();
    expect(tutorialPrefsModule.useTutorialStore.getState().homeSeen).toBe(
      false,
    );
    expect(tutorialPrefsModule.useTutorialStore.getState().gameSeen).toBe(
      false,
    );
  });
});
