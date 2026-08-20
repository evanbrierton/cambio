"use client";

import { useEffect, useState } from "react";
import { useShallow } from "zustand/react/shallow";
import {
  onTutorialPrefsHydrated,
  useRehydrateTutorialPrefs,
  useTutorialStore,
} from "@/store/tutorial-prefs";

export function useTutorial() {
  useRehydrateTutorialPrefs();
  const [hydrated, setHydrated] = useState(() =>
    useTutorialStore.persist.hasHydrated(),
  );

  useEffect(() => {
    return onTutorialPrefsHydrated(() => setHydrated(true));
  }, []);

  const prefs = useTutorialStore(
    useShallow((state) => ({
      homeSeen: state.homeSeen,
      gameSeen: state.gameSeen,
      markHomeSeen: state.markHomeSeen,
      markGameSeen: state.markGameSeen,
      replayHomeTutorial: state.replayHomeTutorial,
      replayGameTutorial: state.replayGameTutorial,
      resetAll: state.resetAll,
    })),
  );

  return { hydrated, ...prefs };
}
