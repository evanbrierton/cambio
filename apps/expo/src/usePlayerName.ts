import {
  getDefaultPlatformAdapters,
  getStoredPlayerName,
  setStoredPlayerName,
} from "@cambio/client";
import { useCallback, useEffect, useState } from "react";

export function usePlayerName() {
  const [playerName, setPlayerNameState] = useState("");
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const storage = getDefaultPlatformAdapters().persistentStorage;
    setPlayerNameState(getStoredPlayerName(storage));
    setHydrated(true);
  }, []);

  const setPlayerName = useCallback((name: string) => {
    setPlayerNameState(name);
    setStoredPlayerName(name, getDefaultPlatformAdapters().persistentStorage);
  }, []);

  return { playerName, setPlayerName, hydrated };
}
