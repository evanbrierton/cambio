"use client";

import { useEffect } from "react";

export function PwaRegistrar() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    if (process.env.NODE_ENV !== "production") return;

    navigator.serviceWorker.register("/sw.js").catch(() => {
      // Service worker registration is best-effort for installability.
    });
  }, []);

  return null;
}
