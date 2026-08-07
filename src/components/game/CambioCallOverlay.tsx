"use client";

import { AnimatePresence, motion } from "framer-motion";
import type { CambioFlash } from "@/hooks/useGameConnection";
import type { ThemeVoice } from "@/lib/themes";

export function CambioCallOverlay({
  cambioFlash,
  callerName,
  isSelfCall,
  voice,
}: {
  cambioFlash: CambioFlash | null;
  callerName: string;
  isSelfCall: boolean;
  voice: ThemeVoice;
}) {
  return (
    <AnimatePresence>
      {cambioFlash ? (
        <motion.div
          key={`cambio-${cambioFlash.playerId}`}
          className="fixed inset-0 z-[120] flex items-center justify-center px-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          role="alert"
          aria-live="assertive"
        >
          <motion.div
            className="absolute inset-0 bg-black/60"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          />
          <motion.div
            className="relative pixel-border bg-danger-surface ring-4 ring-danger/70 shadow-glow-accent px-6 py-8 sm:px-10 sm:py-12 text-center max-w-md w-full"
            initial={{ opacity: 0, scale: 0.5, y: 20 }}
            animate={{
              opacity: 1,
              scale: [0.5, 1.08, 1],
              y: 0,
            }}
            exit={{ opacity: 0, scale: 0.85, y: -10 }}
            transition={{
              duration: 0.45,
              ease: [0.22, 1, 0.36, 1],
              scale: { times: [0, 0.6, 1], duration: 0.45 },
            }}
          >
            <p className="font-display text-3xl sm:text-5xl title-glow text-danger-text animate-pulse leading-tight">
              {voice.cambio}
            </p>
            <p
              className={`mt-4 sm:mt-6 font-display text-xs sm:text-sm ${
                isSelfCall ? "text-danger-text" : "text-accent-soft"
              }`}
            >
              {isSelfCall ? voice.cambioSelf : callerName}
            </p>
            <p className="mt-2 font-display text-[10px] sm:text-xs text-theme-muted">
              {voice.cambioFinalRound}
            </p>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
