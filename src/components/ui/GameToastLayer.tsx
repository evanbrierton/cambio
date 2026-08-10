"use client";

import { AnimatePresence, motion } from "framer-motion";
import type { ReactNode } from "react";

export type GameToastTone =
  | "error"
  | "snap"
  | "turn"
  | "action"
  | "swap"
  | "peek"
  | "info";

export interface GameToastItem {
  id: string;
  message: ReactNode;
  tone: GameToastTone;
  pulse?: boolean;
  action?: ReactNode;
}

const toneClass: Record<GameToastTone, string> = {
  error: "bg-danger-surface text-danger-text ring-danger/60",
  snap: "bg-snap-hint text-danger-text ring-danger/50",
  turn: "bg-swap-hint text-accent ring-accent",
  action: "bg-action-hint text-accent-alt ring-accent-alt",
  swap: "bg-swap-first-selected text-accent-alt ring-accent-alt",
  peek: "bg-peek-seat-flash text-accent-alt ring-accent-alt",
  info: "bg-surface-elevated text-theme ring-theme-muted",
};

export function GameToast({
  toast,
  fromBottom = false,
  inline = false,
  className = "",
}: {
  toast: GameToastItem;
  fromBottom?: boolean;
  inline?: boolean;
  className?: string;
}) {
  const offset = fromBottom ? 12 : -12;
  const motionState = inline
    ? {
        initial: { opacity: 0 },
        animate: { opacity: 1 },
        exit: { opacity: 0 },
      }
    : {
        initial: { opacity: 0, y: offset, scale: 0.96 },
        animate: { opacity: 1, y: 0, scale: 1 },
        exit: { opacity: 0, y: offset / 1.5, scale: 0.96 },
      };

  return (
    <motion.div
      {...motionState}
      transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
      className={`pixel-border ring-2 p-3 font-display text-[10px] sm:text-xs text-center shadow-glow-accent max-w-lg w-full sm:w-auto sm:min-w-[min(100%,20rem)] mx-auto ${toneClass[toast.tone]} ${toast.pulse ? "animate-pulse" : ""} ${className}`}
    >
      <div>{toast.message}</div>
      {toast.action ? (
        <div className="mt-2 flex justify-center">{toast.action}</div>
      ) : null}
    </motion.div>
  );
}

export function GameToastLayer({ toasts }: { toasts: GameToastItem[] }) {
  if (toasts.length === 0) {
    return null;
  }

  return (
    <div
      className="fixed inset-x-0 bottom-0 z-100 pointer-events-none flex flex-col-reverse items-stretch sm:items-center gap-2 px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]"
      aria-live="polite"
    >
      <AnimatePresence initial={false} mode="popLayout">
        {toasts.map((toast) => (
          <GameToast
            key={toast.id}
            toast={toast}
            fromBottom={true}
            className="pointer-events-auto"
          />
        ))}
      </AnimatePresence>
    </div>
  );
}
