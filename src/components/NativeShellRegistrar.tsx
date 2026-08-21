"use client";

import { applyNativeShellChrome, isNativePlatform } from "@cambio/client";
import { useEffect } from "react";

export function NativeShellRegistrar() {
  useEffect(() => {
    if (!isNativePlatform()) return;
    document.documentElement.classList.add("native-shell");
    void applyNativeShellChrome();
  }, []);

  return null;
}
