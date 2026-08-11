"use client";

import { useCallback, useEffect, useState } from "react";
import {
  isGameTutorialSeen,
  isHomeTutorialSeen,
  markGameTutorialSeen,
  markHomeTutorialSeen,
  resetAllTutorialSeen,
  resetGameTutorialSeen,
  resetHomeTutorialSeen,
} from "@/lib/tutorial";

type TutorialState = {
  hydrated: boolean;
  homeSeen: boolean;
  gameSeen: boolean;
};

export function useTutorial() {
  const [state, setState] = useState<TutorialState>({
    hydrated: false,
    homeSeen: false,
    gameSeen: false,
  });

  useEffect(() => {
    setState({
      hydrated: true,
      homeSeen: isHomeTutorialSeen(),
      gameSeen: isGameTutorialSeen(),
    });
  }, []);

  const markHomeSeen = useCallback(() => {
    markHomeTutorialSeen();
    setState((current) => ({ ...current, homeSeen: true }));
  }, []);

  const markGameSeen = useCallback(() => {
    markGameTutorialSeen();
    setState((current) => ({ ...current, gameSeen: true }));
  }, []);

  const replayHomeTutorial = useCallback(() => {
    resetHomeTutorialSeen();
    setState((current) => ({ ...current, homeSeen: false }));
  }, []);

  const replayGameTutorial = useCallback(() => {
    resetGameTutorialSeen();
    setState((current) => ({ ...current, gameSeen: false }));
  }, []);

  const resetAll = useCallback(() => {
    resetAllTutorialSeen();
    setState((current) => ({ ...current, homeSeen: false, gameSeen: false }));
  }, []);

  return {
    hydrated: state.hydrated,
    homeSeen: state.homeSeen,
    gameSeen: state.gameSeen,
    markHomeSeen,
    markGameSeen,
    replayHomeTutorial,
    replayGameTutorial,
    resetAll,
  };
}
