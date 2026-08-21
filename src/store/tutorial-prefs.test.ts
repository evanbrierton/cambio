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
    dismissedCoachHints: [],
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
    expect(
      tutorialPrefsModule.useTutorialStore.getState().dismissedCoachHints,
    ).toEqual([]);
  });

  it("keeps dismissed coach hints in memory without persisting them", async () => {
    tutorialPrefsModule.useTutorialStore.getState().dismissCoachHint("deck");
    expect(
      tutorialPrefsModule.useTutorialStore.getState().dismissedCoachHints,
    ).toEqual(["deck"]);

    const raw = localStorage.getItem(
      tutorialPrefsModule.TUTORIAL_PREFS_STORAGE_KEY,
    );
    expect(parseTutorialPrefsPersistJson(raw ?? "")).toEqual({
      homeSeen: false,
      gameSeen: false,
    });

    tutorialPrefsModule.useTutorialStore.getState().replayGameTutorial();
    expect(
      tutorialPrefsModule.useTutorialStore.getState().dismissedCoachHints,
    ).toEqual([]);
  });

  it("does not wipe dismissed coach hints when persist rehydrates", async () => {
    tutorialPrefsModule.useTutorialStore.getState().dismissCoachHint("deck");
    await tutorialPrefsModule.useTutorialStore.persist.rehydrate();
    expect(
      tutorialPrefsModule.useTutorialStore.getState().dismissedCoachHints,
    ).toEqual(["deck"]);
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

  it("onFinishHydration does not notify listeners registered after rehydrate", async () => {
    await tutorialPrefsModule.useTutorialStore.persist.rehydrate();
    expect(tutorialPrefsModule.useTutorialStore.persist.hasHydrated()).toBe(
      true,
    );

    let notified = false;
    const unsub =
      tutorialPrefsModule.useTutorialStore.persist.onFinishHydration(() => {
        notified = true;
      });
    expect(notified).toBe(false);
    unsub();
  });

  it("onTutorialPrefsHydrated catches up if rehydrate already finished", async () => {
    await tutorialPrefsModule.useTutorialStore.persist.rehydrate();
    expect(tutorialPrefsModule.useTutorialStore.persist.hasHydrated()).toBe(
      true,
    );

    let notified = 0;
    const unsub = tutorialPrefsModule.onTutorialPrefsHydrated(() => {
      notified += 1;
    });
    expect(notified).toBe(1);
    unsub();
  });

  it("onTutorialPrefsHydrated notifies when rehydrate finishes later", async () => {
    expect(tutorialPrefsModule.useTutorialStore.persist.hasHydrated()).toBe(
      false,
    );

    let notified = 0;
    const unsub = tutorialPrefsModule.onTutorialPrefsHydrated(() => {
      notified += 1;
    });
    expect(notified).toBe(0);

    await tutorialPrefsModule.useTutorialStore.persist.rehydrate();
    expect(notified).toBe(1);
    unsub();
  });
});
