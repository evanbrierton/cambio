"use client";

import { AnimatePresence, motion } from "framer-motion";
import type { ThemeVoice } from "@/lib/themes";

export function SnapWindowOverlay({
  active,
  seconds,
  voice,
}: {
  active: boolean;
  seconds: number | null;
  voice: ThemeVoice;
}) {
  const show = active && seconds !== null;
  const urgent = seconds !== null && seconds <= 3;

  return (
    <AnimatePresence>
      {show ? (
        <motion.div
          key="snap-window"
          className="fixed inset-0 z-[115] pointer-events-none"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
          role="alert"
          aria-live="assertive"
        >
          <motion.div
            className={`absolute inset-0 snap-window-vignette ${
              urgent ? "snap-window-vignette-urgent" : ""
            }`}
            animate={{
              opacity: urgent ? [0.55, 0.85, 0.55] : [0.35, 0.55, 0.35],
            }}
            transition={{
              duration: urgent ? 0.55 : 1.4,
              repeat: Number.POSITIVE_INFINITY,
              ease: "easeInOut",
            }}
          />

          <div className="absolute inset-x-0 top-0 flex justify-center px-3 pt-[max(0.75rem,env(safe-area-inset-top))]">
            <motion.div
              className={`pixel-border px-4 py-3 sm:px-6 sm:py-4 text-center max-w-md w-full ring-4 ${
                urgent
                  ? "bg-danger-surface ring-danger/80 shadow-glow-accent"
                  : "bg-snap-hint ring-danger/60 shadow-glow-accent"
              }`}
              initial={{ opacity: 0, y: -24, scale: 0.92 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -16, scale: 0.95 }}
              transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            >
              <p className="font-display text-[10px] sm:text-xs tracking-[0.2em] text-accent-soft uppercase">
                {voice.phases.snap_window}
              </p>
              <motion.p
                key={seconds}
                className={`font-display mt-1 leading-none ${
                  urgent
                    ? "text-5xl sm:text-6xl text-danger-text title-glow"
                    : "text-4xl sm:text-5xl text-danger-text"
                }`}
                initial={{ scale: 1.35, opacity: 0.5 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.18, ease: "easeOut" }}
              >
                {seconds}
              </motion.p>
              <p className="mt-2 font-display text-[9px] sm:text-[10px] text-theme-muted">
                {voice.snapWindowHint(seconds)}
              </p>
            </motion.div>
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
