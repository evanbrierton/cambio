"use client";

import { useEffect } from "react";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { tutorialPrefsPersistStateSchema } from "@/store/tutorial-prefs-schema";

export const TUTORIAL_PREFS_STORAGE_KEY = "cambio-tutorial-prefs";

type TutorialPrefsData = {
  homeSeen: boolean;
  gameSeen: boolean;
};

type TutorialPrefsState = TutorialPrefsData & {
  markHomeSeen: () => void;
  markGameSeen: () => void;
  replayHomeTutorial: () => void;
  replayGameTutorial: () => void;
  resetAll: () => void;
};

const defaultPrefs: TutorialPrefsData = {
  homeSeen: false,
  gameSeen: false,
};

function sanitizePersistedPrefs(persisted: unknown): Partial<TutorialPrefsData> {
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
      replayHomeTutorial: () => set({ homeSeen: false }),
      replayGameTutorial: () => set({ gameSeen: false }),
      resetAll: () => set({ homeSeen: false, gameSeen: false }),
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
