"use client";

import { useCallback, useEffect, useState } from "react";
import { isPlayerGridEnabled, setPlayerGridEnabled } from "@/lib/player-layout";

export function usePlayerGridEnabled() {
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    setEnabled(isPlayerGridEnabled());
  }, []);

  const toggle = useCallback(() => {
    setEnabled((prev) => {
      const next = !prev;
      setPlayerGridEnabled(next);
      return next;
    });
  }, []);

  return { playerGridEnabled: enabled, togglePlayerGrid: toggle };
}
