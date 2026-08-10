"use client";

import { AnimatePresence } from "framer-motion";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { GameToast } from "@/components/ui/GameToastLayer";
import { RetroButton } from "@/components/ui/RetroButton";
import {
  type BeforeInstallPromptEvent,
  dismissInstallPrompt,
  isInstallDismissed,
  isIosDevice,
  isStandaloneDisplay,
} from "@/lib/pwa-install";

const SHOW_DELAY_MS = 2500;

export function PwaInstallPrompt() {
  const pathname = usePathname();
  const onHome = pathname === "/";
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [iosGuide, setIosGuide] = useState(false);
  const [visible, setVisible] = useState(false);
  const [installing, setInstalling] = useState(false);
  const showTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearShowTimer = useCallback(() => {
    if (showTimerRef.current !== null) {
      clearTimeout(showTimerRef.current);
      showTimerRef.current = null;
    }
  }, []);

  // Capture installability independently of route so the event isn't missed.
  useEffect(() => {
    if (isStandaloneDisplay()) {
      return;
    }

    const onBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setDeferredPrompt(event as BeforeInstallPromptEvent);
      setIosGuide(false);
    };

    const onAppInstalled = () => {
      setDeferredPrompt(null);
      setIosGuide(false);
      setVisible(false);
    };

    window.addEventListener("beforeinstallprompt", onBeforeInstallPrompt);
    window.addEventListener("appinstalled", onAppInstalled);

    if (isIosDevice()) {
      setIosGuide(true);
    }

    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstallPrompt);
      window.removeEventListener("appinstalled", onAppInstalled);
    };
  }, []);

  // Only prompt on the home screen, and respect dismiss / standalone state.
  useEffect(() => {
    clearShowTimer();

    const eligible =
      onHome &&
      !isStandaloneDisplay() &&
      !isInstallDismissed() &&
      (deferredPrompt !== null || iosGuide);

    if (!eligible) {
      setVisible(false);
      return;
    }

    showTimerRef.current = setTimeout(() => {
      setVisible(true);
    }, SHOW_DELAY_MS);

    return clearShowTimer;
  }, [clearShowTimer, deferredPrompt, iosGuide, onHome]);

  const hide = useCallback(() => {
    clearShowTimer();
    setVisible(false);
  }, [clearShowTimer]);

  const onDismiss = useCallback(() => {
    dismissInstallPrompt();
    hide();
  }, [hide]);

  const onInstall = useCallback(async () => {
    if (!deferredPrompt || installing) {
      return;
    }

    setInstalling(true);
    try {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === "dismissed") {
        dismissInstallPrompt();
      }
    } catch {
      dismissInstallPrompt();
    } finally {
      setDeferredPrompt(null);
      setInstalling(false);
      hide();
    }
  }, [deferredPrompt, hide, installing]);

  const canShowNativeInstall = deferredPrompt !== null;
  const canShowIosGuide = iosGuide && !canShowNativeInstall;

  if (!(visible && (canShowNativeInstall || canShowIosGuide))) {
    return null;
  }

  return (
    <div
      className="fixed inset-x-0 bottom-0 z-90 pointer-events-none flex flex-col items-stretch sm:items-center gap-2 px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]"
      aria-live="polite"
    >
      <AnimatePresence initial={false}>
        {canShowNativeInstall ? (
          <GameToast
            key="pwa-install"
            fromBottom={true}
            className="pointer-events-auto"
            toast={{
              id: "pwa-install",
              tone: "info",
              message: (
                <span className="normal-case tracking-normal">
                  Install Cambio for quicker launch and a full-screen table.
                </span>
              ),
              action: (
                <div className="flex flex-wrap items-center justify-center gap-2">
                  <RetroButton
                    className="py-2! px-3!"
                    disabled={installing}
                    onClick={() => {
                      void onInstall();
                    }}
                  >
                    {installing ? "Installing…" : "Install"}
                  </RetroButton>
                  <RetroButton
                    variant="secondary"
                    className="py-2! px-3!"
                    onClick={onDismiss}
                  >
                    Not now
                  </RetroButton>
                </div>
              ),
            }}
          />
        ) : (
          <GameToast
            key="pwa-ios"
            fromBottom={true}
            className="pointer-events-auto"
            toast={{
              id: "pwa-ios",
              tone: "info",
              message: (
                <span className="normal-case tracking-normal">
                  Add Cambio to your Home Screen: tap Share, then{" "}
                  <span className="text-accent">Add to Home Screen</span>.
                </span>
              ),
              action: (
                <RetroButton
                  variant="secondary"
                  className="py-2! px-3!"
                  onClick={onDismiss}
                >
                  Got it
                </RetroButton>
              ),
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
