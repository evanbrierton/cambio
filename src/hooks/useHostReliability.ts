"use client";

import { useEffect, useRef } from "react";

export type HostReliabilityOptions = {
  enabled: boolean;
  gameActive: boolean;
  onVisibilityHidden?: () => void;
  onVisibilityVisible?: () => void;
};

type WakeLockSentinel = {
  release: () => Promise<void>;
};

export async function requestScreenWakeLock(): Promise<WakeLockSentinel | null> {
  if (typeof navigator === "undefined") return null;
  const wakeLock = (
    navigator as Navigator & {
      wakeLock?: { request: (type: "screen") => Promise<WakeLockSentinel> };
    }
  ).wakeLock;
  if (!wakeLock) return null;

  try {
    return await wakeLock.request("screen");
  } catch {
    return null;
  }
}

export function mountHostReliability(
  options: HostReliabilityOptions,
): () => void {
  const shouldHoldLock = options.enabled && options.gameActive;
  if (!shouldHoldLock) {
    return () => {};
  }

  let cancelled = false;
  let sentinel: WakeLockSentinel | null = null;

  const acquire = async () => {
    if (cancelled || document.visibilityState !== "visible") return;
    const nextSentinel = await requestScreenWakeLock();
    if (cancelled) {
      void nextSentinel?.release();
      return;
    }
    sentinel = nextSentinel;
  };

  void acquire();

  const onVisibilityChange = () => {
    if (document.visibilityState === "hidden") {
      options.onVisibilityHidden?.();
      void sentinel?.release();
      sentinel = null;
      return;
    }

    options.onVisibilityVisible?.();
    void acquire();
  };

  document.addEventListener("visibilitychange", onVisibilityChange);

  return () => {
    cancelled = true;
    document.removeEventListener("visibilitychange", onVisibilityChange);
    void sentinel?.release();
    sentinel = null;
  };
}

export function useHostReliability(options: HostReliabilityOptions) {
  const callbacksRef = useRef({
    onVisibilityHidden: options.onVisibilityHidden,
    onVisibilityVisible: options.onVisibilityVisible,
  });
  callbacksRef.current = {
    onVisibilityHidden: options.onVisibilityHidden,
    onVisibilityVisible: options.onVisibilityVisible,
  };

  useEffect(() => {
    return mountHostReliability({
      enabled: options.enabled,
      gameActive: options.gameActive,
      onVisibilityHidden: () => callbacksRef.current.onVisibilityHidden?.(),
      onVisibilityVisible: () => callbacksRef.current.onVisibilityVisible?.(),
    });
  }, [options.enabled, options.gameActive]);
}
