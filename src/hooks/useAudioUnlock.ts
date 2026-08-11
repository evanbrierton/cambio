"use client";

import { useEffect } from "react";
import { resumeCtx } from "@/lib/sounds";

/** Unlock Web Audio on first user gesture (required on iOS / mobile Chrome). */
export function useAudioUnlock(): void {
  useEffect(() => {
    if (typeof window === "undefined") return;

    let unlocked = false;

    const unlock = () => {
      if (unlocked) return;
      unlocked = true;
      void resumeCtx();
      window.removeEventListener("pointerdown", unlock);
      window.removeEventListener("keydown", unlock);
    };

    window.addEventListener("pointerdown", unlock, { passive: true });
    window.addEventListener("keydown", unlock);

    return () => {
      window.removeEventListener("pointerdown", unlock);
      window.removeEventListener("keydown", unlock);
    };
  }, []);
}
