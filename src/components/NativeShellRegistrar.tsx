"use client";

import { applyNativeShellChrome, isNativePlatform } from "@cambio/client";
import { useEffect } from "react";

export function NativeShellRegistrar() {
  useEffect(() => {
    if (!isNativePlatform()) return;
    void applyNativeShellChrome();
  }, []);

  return null;
}
