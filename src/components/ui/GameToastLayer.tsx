"use client";

import type { ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";

export type GameToastTone = "error" | "snap" | "turn" | "action" | "swap" | "peek" | "info";

export type GameToastItem = {
  id: string;
  message: ReactNode;
  tone: GameToastTone;
  pulse?: boolean;
  action?: ReactNode;
};

const toneClass: Record<GameToastTone, string> = {
  error: "bg-danger-surface text-danger-text ring-danger/60",
  snap: "bg-snap-hint text-danger-text ring-danger/50",
  turn: "bg-swap-hint text-accent ring-accent",
  action: "bg-action-hint text-accent-alt ring-accent-alt",
  swap: "bg-swap-first-selected text-accent-alt ring-accent-alt",
  peek: "bg-peek-seat-flash text-accent-alt ring-accent-alt",
  info: "bg-surface-elevated text-theme ring-theme-muted",
};

export function GameToastLayer({ toasts }: { toasts: GameToastItem[] }) {
  return (
    <div
      className="fixed inset-x-0 top-0 z-[100] pointer-events-none flex flex-col items-stretch sm:items-center gap-2 px-3 pt-[max(0.75rem,env(safe-area-inset-top))]"
      aria-live="polite"
    >
      <AnimatePresence initial={false} mode="popLayout">
        {toasts.map((toast) => (
          <motion.div
            key={toast.id}
            layout
            initial={{ opacity: 0, y: -12, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.96 }}
            transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
            className={`pointer-events-auto pixel-border ring-2 p-3 font-display text-[10px] sm:text-xs text-center shadow-glow-accent max-w-lg w-full sm:w-auto sm:min-w-[min(100%,20rem)] mx-auto ${toneClass[toast.tone]} ${toast.pulse ? "animate-pulse" : ""}`}
          >
            <div>{toast.message}</div>
            {toast.action ? (
              <div className="mt-2 flex justify-center">{toast.action}</div>
            ) : null}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
