"use client";

import { AnimatePresence, motion } from "framer-motion";
import Link from "next/link";
import { useCallback, useEffect, useRef } from "react";
import { RetroButton } from "@/components/ui/RetroButton";

export type TutorialModalStep = {
  title: string;
  body: string;
};

const STEPS: TutorialModalStep[] = [
  {
    title: "Lowest score wins",
    body: "You start with four face-down cards. End the round with the fewest points to win.",
  },
  {
    title: "Peek once at setup",
    body: "Before the first turn, tap two of your own cards to peek — remember what you saw.",
  },
  {
    title: "Draw, swap, or discard",
    body: "On your turn, draw from the deck or discard pile. Swap into your hand or discard to trigger special abilities.",
  },
  {
    title: "Snap matching cards",
    body: "If you have the same rank as the top discard, snap anytime — even on someone else's turn — to dump another card.",
  },
  {
    title: 'Call "Cambio"',
    body: "When your hand looks good, call Cambio at the start of your turn. Everyone gets one last turn, then scores are revealed.",
  },
];

type TutorialModalProps = {
  open: boolean;
  onClose: () => void;
  onComplete?: () => void;
  stepIndex: number;
  onStepIndexChange: (index: number) => void;
};

export function TutorialModal({
  open,
  onClose,
  onComplete,
  stepIndex,
  onStepIndexChange,
}: TutorialModalProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const lastStep = STEPS.length - 1;
  const step = STEPS[stepIndex];

  const finish = useCallback(() => {
    onComplete?.();
    onClose();
  }, [onClose, onComplete]);

  const skip = useCallback(() => {
    finish();
  }, [finish]);

  useEffect(() => {
    if (!open) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        skip();
        return;
      }

      if (event.key === "ArrowRight" && stepIndex < lastStep) {
        event.preventDefault();
        onStepIndexChange(stepIndex + 1);
        return;
      }

      if (event.key === "ArrowLeft" && stepIndex > 0) {
        event.preventDefault();
        onStepIndexChange(stepIndex - 1);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [lastStep, onStepIndexChange, open, skip, stepIndex]);

  useEffect(() => {
    if (!open) return;

    const dialog = dialogRef.current;
    if (!dialog) return;

    const focusable = dialog.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
    );
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    first?.focus();

    const trapFocus = (event: KeyboardEvent) => {
      if (event.key !== "Tab" || focusable.length === 0) return;

      if (event.shiftKey) {
        if (document.activeElement === first) {
          event.preventDefault();
          last?.focus();
        }
        return;
      }

      if (document.activeElement === last) {
        event.preventDefault();
        first?.focus();
      }
    };

    window.addEventListener("keydown", trapFocus);
    return () => window.removeEventListener("keydown", trapFocus);
  }, [open]);

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          className="fixed inset-0 z-130 flex items-end sm:items-center justify-center px-4 pb-[max(1rem,env(safe-area-inset-bottom,0px))] sm:pb-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          role="presentation"
        >
          <motion.button
            type="button"
            aria-label="Skip tutorial"
            className="absolute inset-0 bg-black/60"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={skip}
          />
          <motion.div
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="tutorial-modal-title"
            aria-describedby="tutorial-modal-body"
            className="relative pixel-border bg-surface-elevated w-full max-w-md p-5 sm:p-6 space-y-5 shadow-glow-accent"
            initial={{ opacity: 0, scale: 0.92, y: 24 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 12 }}
            transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-2 text-left min-w-0">
                <p className="font-display text-[10px] text-theme-muted">
                  How to play · {stepIndex + 1} / {STEPS.length}
                </p>
                <h2
                  id="tutorial-modal-title"
                  className="font-display text-lg sm:text-xl title-glow leading-tight"
                >
                  {step.title}
                </h2>
                <p
                  id="tutorial-modal-body"
                  className="text-sm text-theme normal-case tracking-normal leading-relaxed"
                >
                  {step.body}
                </p>
              </div>
              <button
                type="button"
                onClick={skip}
                className="chip-btn shrink-0 px-2 py-1 text-[10px] border-theme-muted text-theme-muted hover:border-accent hover:text-accent transition-colors"
              >
                Skip
              </button>
            </div>

            <div className="flex items-center justify-center gap-2">
              {STEPS.map((entry, index) => (
                <span
                  key={entry.title}
                  className={`h-2 w-2 rounded-full transition-colors ${
                    index === stepIndex ? "bg-accent" : "bg-theme-muted/40"
                  }`}
                  aria-hidden
                />
              ))}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <RetroButton
                variant="secondary"
                disabled={stepIndex === 0}
                onClick={() => onStepIndexChange(stepIndex - 1)}
                className="flex-1 min-w-24"
              >
                Back
              </RetroButton>
              {stepIndex < lastStep ? (
                <RetroButton
                  onClick={() => onStepIndexChange(stepIndex + 1)}
                  className="flex-1 min-w-24"
                >
                  Next
                </RetroButton>
              ) : (
                <RetroButton onClick={finish} className="flex-1 min-w-24">
                  Got it
                </RetroButton>
              )}
            </div>

            <p className="text-center font-display text-[10px] text-theme-muted">
              <Link
                href="/rules"
                className="text-accent hover:text-accent-soft transition-colors"
                onClick={finish}
              >
                Full rules
              </Link>
            </p>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
