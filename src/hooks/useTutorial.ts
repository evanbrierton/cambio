"use client";

import { useEffect, useState } from "react";
import { useShallow } from "zustand/react/shallow";
import { debugTutorialLog } from "@/lib/debug-tutorial-log";
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
    const alreadyHasHydrated = useTutorialStore.persist.hasHydrated();
    // #region agent log
    debugTutorialLog("A", "useTutorial.ts:onFinishHydration", "listener registered", {
      alreadyHasHydrated,
      gameSeen: useTutorialStore.getState().gameSeen,
    });
    // #endregion
    const unsub = useTutorialStore.persist.onFinishHydration(() => {
      // #region agent log
      debugTutorialLog("A", "useTutorial.ts:onFinishHydration", "hydration finished callback", {
        hasHydrated: useTutorialStore.persist.hasHydrated(),
        gameSeen: useTutorialStore.getState().gameSeen,
      });
      // #endregion
      setHydrated(true);
    });
    // persist.rehydrate() can finish synchronously (localStorage) before this
    // effect runs, so onFinishHydration would never fire without a catch-up.
    if (useTutorialStore.persist.hasHydrated()) {
      // #region agent log
      debugTutorialLog("A", "useTutorial.ts:onFinishHydration", "already hydrated catch-up", {
        alreadyHasHydrated,
        gameSeen: useTutorialStore.getState().gameSeen,
        runId: "post-fix",
      });
      // #endregion
      setHydrated(true);
    }
    return unsub;
  }, []);

  const snapshot = useTutorialStore(
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

  useEffect(() => {
    // #region agent log
    debugTutorialLog("F", "useTutorial.ts:snapshot", "hydrated/gameSeen snapshot", {
      reactHydrated: hydrated,
      selectorHydrated: snapshot.hydrated,
      selectorGameSeen: snapshot.gameSeen,
      storeGameSeen: useTutorialStore.getState().gameSeen,
      hasHydrated: useTutorialStore.persist.hasHydrated(),
    });
    // #endregion
  }, [hydrated, snapshot.hydrated, snapshot.gameSeen]);

  return snapshot;
}
