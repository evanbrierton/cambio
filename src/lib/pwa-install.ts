import {
  getDefaultPlatformAdapters,
  PWA_INSTALL_DISMISS_KEY,
} from "@cambio/client";

export { PWA_INSTALL_DISMISS_KEY };

/** How long a "Not now" dismissal lasts before the prompt can show again. */
export const PWA_INSTALL_DISMISS_MS = 14 * 24 * 60 * 60 * 1000;

export type BeforeInstallPromptOutcome = "accepted" | "dismissed";

/** Chromium `beforeinstallprompt` event shape (not in standard DOM typings). */
export type BeforeInstallPromptEvent = Event & {
  readonly platforms: string[];
  readonly userChoice: Promise<{ outcome: BeforeInstallPromptOutcome }>;
  prompt: () => Promise<void>;
};

export function isStandaloneDisplay(): boolean {
  if (typeof window === "undefined") return false;

  const mediaStandalone = window.matchMedia(
    "(display-mode: standalone)",
  ).matches;
  const mediaFullscreen = window.matchMedia(
    "(display-mode: fullscreen)",
  ).matches;
  const mediaMinimal = window.matchMedia("(display-mode: minimal-ui)").matches;
  const iosStandalone =
    "standalone" in navigator &&
    Boolean((navigator as Navigator & { standalone?: boolean }).standalone);

  return mediaStandalone || mediaFullscreen || mediaMinimal || iosStandalone;
}

export function isIosDevice(): boolean {
  if (typeof navigator === "undefined") return false;

  const ua = navigator.userAgent;
  if (/iPad|iPhone|iPod/.test(ua)) return true;

  return (
    navigator.platform === "MacIntel" &&
    typeof navigator.maxTouchPoints === "number" &&
    navigator.maxTouchPoints > 1
  );
}

export function isInstallDismissed(now = Date.now()): boolean {
  if (typeof window === "undefined") return true;

  const storage = getDefaultPlatformAdapters().persistentStorage;
  const raw = storage.getItem(PWA_INSTALL_DISMISS_KEY);
  if (!raw) return false;

  const dismissedAt = Number(raw);
  if (!Number.isFinite(dismissedAt)) return false;

  return now - dismissedAt < PWA_INSTALL_DISMISS_MS;
}

export function dismissInstallPrompt(now = Date.now()): void {
  if (typeof window === "undefined") return;
  getDefaultPlatformAdapters().persistentStorage.setItem(
    PWA_INSTALL_DISMISS_KEY,
    String(now),
  );
}

export function clearInstallDismiss(): void {
  if (typeof window === "undefined") return;
  getDefaultPlatformAdapters().persistentStorage.removeItem(
    PWA_INSTALL_DISMISS_KEY,
  );
}
