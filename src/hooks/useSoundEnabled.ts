"use client";

import { useCallback, useEffect, useState } from "react";
import { isSoundEnabled, setSoundEnabled } from "@/lib/sounds";

export function useSoundEnabled() {
  const [enabled, setEnabled] = useState(true);

  useEffect(() => {
    setEnabled(isSoundEnabled());
  }, []);

  const toggle = useCallback(() => {
    setEnabled((prev) => {
      const next = !prev;
      setSoundEnabled(next);
      return next;
    });
  }, []);

  return { soundEnabled: enabled, toggleSound: toggle };
}
