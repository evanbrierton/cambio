"use client";

import { useEffect } from "react";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import type { CoachHintId } from "@/lib/coach-moments";
import { tutorialPrefsPersistStateSchema } from "./tutorial-prefs-schema";

export const TUTORIAL_PREFS_STORAGE_KEY = "cambio-tutorial-prefs";

type TutorialPrefsData = {
  homeSeen: boolean;
  gameSeen: boolean;
  dismissedCoachHints: CoachHintId[];
};

type TutorialPrefsState = TutorialPrefsData & {
  markHomeSeen: () => void;
  markGameSeen: () => void;
  dismissCoachHint: (id: CoachHintId) => void;
  replayHomeTutorial: () => void;
  replayGameTutorial: () => void;
  resetAll: () => void;
};

const defaultPrefs: TutorialPrefsData = {
  homeSeen: false,
  gameSeen: false,
  dismissedCoachHints: [],
};

function sanitizePersistedPrefs(
  persisted: unknown,
): Partial<TutorialPrefsData> {
  const result = tutorialPrefsPersistStateSchema.safeParse(persisted);
  if (!result.success) return {};

  const prefs = result.data;
  return {
    homeSeen: prefs.homeSeen ?? false,
    gameSeen: prefs.gameSeen ?? false,
  };
}

export const useTutorialStore = create<TutorialPrefsState>()(
  persist(
    (set) => ({
      ...defaultPrefs,
      markHomeSeen: () => set({ homeSeen: true }),
      markGameSeen: () => set({ gameSeen: true }),
      dismissCoachHint: (id) =>
        set((state) => {
          if (state.dismissedCoachHints.includes(id)) return state;
          return {
            dismissedCoachHints: [...state.dismissedCoachHints, id],
          };
        }),
      replayHomeTutorial: () => set({ homeSeen: false }),
      replayGameTutorial: () =>
        set({ gameSeen: false, dismissedCoachHints: [] }),
      resetAll: () => set({ ...defaultPrefs }),
    }),
    {
      name: TUTORIAL_PREFS_STORAGE_KEY,
      storage: createJSONStorage(() => localStorage),
      skipHydration: true,
      merge: (persisted, current) => ({
        ...current,
        ...sanitizePersistedPrefs(persisted),
      }),
      partialize: (state) => ({
        homeSeen: state.homeSeen,
        gameSeen: state.gameSeen,
      }),
    },
  ),
);

export function useRehydrateTutorialPrefs(): void {
  useEffect(() => {
    void useTutorialStore.persist.rehydrate();
  }, []);
}

/**
 * Subscribe to persist hydration, catching up if rehydrate already finished.
 * Zustand does not invoke `onFinishHydration` for listeners registered after
 * `hasHydrated()` is already true (localStorage rehydrate is often sync).
 */
export function onTutorialPrefsHydrated(onHydrated: () => void): () => void {
  const unsubscribe = useTutorialStore.persist.onFinishHydration(onHydrated);
  if (useTutorialStore.persist.hasHydrated()) {
    onHydrated();
  }
  return unsubscribe;
}
