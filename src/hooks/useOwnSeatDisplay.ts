"use client";

import { useCallback, useEffect, useState } from "react";
import {
  getOwnSeatDisplay,
  type OwnSeatDisplay,
  setOwnSeatDisplay,
} from "@/lib/player-layout";

export function useOwnSeatDisplay() {
  const [mode, setMode] = useState<OwnSeatDisplay>("prominent");

  useEffect(() => {
    setMode(getOwnSeatDisplay());
  }, []);

  const toggleOwnSeatDisplay = useCallback(() => {
    setMode((prev) => {
      const next: OwnSeatDisplay =
        prev === "prominent" ? "turn-order" : "prominent";
      setOwnSeatDisplay(next);
      return next;
    });
  }, []);

  return {
    ownSeatDisplay: mode,
    ownSeatProminent: mode === "prominent",
    toggleOwnSeatDisplay,
  };
}
