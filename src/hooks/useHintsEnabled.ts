"use client";

import { useCallback, useEffect, useState } from "react";
import { isHintsEnabled, setHintsEnabled } from "@/lib/hints";

export function useHintsEnabled() {
  const [enabled, setEnabled] = useState(true);

  useEffect(() => {
    setEnabled(isHintsEnabled());
  }, []);

  const toggle = useCallback(() => {
    setEnabled((prev) => {
      const next = !prev;
      setHintsEnabled(next);
      return next;
    });
  }, []);

  return { hintsEnabled: enabled, toggleHints: toggle };
}
