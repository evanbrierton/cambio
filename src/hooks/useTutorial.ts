"use client";

import { useEffect, useState } from "react";
import { useShallow } from "zustand/react/shallow";
import {
  useRehydrateTutorialPrefs,
  useTutorialStore,
} from "@/store/tutorial-prefs";

export function useTutorial() {
  useRehydrateTutorialPrefs();
  const [hydrated, setHydrated] = useState(
    useTutorialStore.persist.hasHydrated(),
  );

  useEffect(() => {
    const unsub = useTutorialStore.persist.onFinishHydration(() => {
      setHydrated(true);
    });
    // persist.rehydrate() can finish synchronously (localStorage) before this
    // effect runs, so onFinishHydration would never fire without a catch-up.
    if (useTutorialStore.persist.hasHydrated()) {
      setHydrated(true);
    }
    return unsub;
  }, []);

  return useTutorialStore(
    useShallow((state) => ({
      hydrated,
      homeSeen: state.homeSeen,
      gameSeen: state.gameSeen,
      markHomeSeen: state.markHomeSeen,
      markGameSeen: state.markGameSeen,
      replayHomeTutorial: state.replayHomeTutorial,
      replayGameTutorial: state.replayGameTutorial,
      resetAll: state.resetAll,
    })),
  );
}
