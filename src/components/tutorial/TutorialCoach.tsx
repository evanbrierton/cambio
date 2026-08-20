"use client";

import { useRef } from "react";
import { Joyride, STATUS, type TooltipRenderProps } from "react-joyride";
import { type CoachHintId, isCoachEligiblePhase } from "@/lib/coach-moments";

export type { CoachHintId };
export { isCoachEligiblePhase };

const COACH_STEPS: Record<
  CoachHintId,
  {
    target: string;
    title: string;
    content: string;
    skipBeacon: boolean;
    placement: "top" | "bottom";
  }
> = {
  "own-hand": {
    target: '[data-tutorial="own-hand"]',
    title: "Your hand",
    content:
      "These four face-down cards are yours. At setup, peek at two of them once — then rely on memory.",
    skipBeacon: true,
    placement: "top",
  },
  deck: {
    target: '[data-tutorial="deck"]',
    title: "Draw from the deck",
    content:
      "On your turn, draw from the deck or discard pile. From the deck you can swap or discard to trigger abilities.",
    skipBeacon: true,
    placement: "bottom",
  },
  discard: {
    target: '[data-tutorial="discard"]',
    title: "Discard pile & snap",
    content:
      "Cards land here face up. If you hold a matching rank, snap anytime to discard another card — wrong snaps cost a penalty.",
    skipBeacon: true,
    placement: "bottom",
  },
  "call-cambio": {
    target: '[data-tutorial="call-cambio"]',
    title: 'Call "Cambio"',
    content:
      "Happy with your hand? Call Cambio at the start of your turn before drawing. Everyone gets one last turn, then scores reveal.",
    skipBeacon: true,
    placement: "top",
  },
};

function CoachTooltip({
  closeProps,
  primaryProps,
  skipProps,
  step,
  tooltipProps,
}: TooltipRenderProps) {
  const btnClass =
    "btn-theme text-[10px] sm:text-xs px-3 py-2 transition-colors active:opacity-80";
  return (
    <div
      {...tooltipProps}
      className="pixel-border bg-surface-elevated p-4 sm:p-5 max-w-[min(92vw,22rem)] shadow-glow-accent text-left font-display text-theme"
    >
      {step.title ? (
        <h3 className="font-display text-sm sm:text-base title-glow mb-2">
          {step.title}
        </h3>
      ) : null}
      <p className="font-display text-[10px] sm:text-xs text-theme leading-relaxed">
        {step.content}
      </p>
      <div className="mt-4 flex flex-wrap items-center gap-2">
        <button
          type="button"
          {...skipProps}
          className={`${btnClass} btn-secondary`}
        >
          Skip
        </button>
        <button
          type="button"
          {...primaryProps}
          className={`${btnClass} btn-primary ml-auto`}
        >
          Got it
        </button>
        <button type="button" {...closeProps} className="sr-only">
          Close coach
        </button>
      </div>
    </div>
  );
}

type TutorialCoachProps = {
  hintId: CoachHintId | null;
  onSkip: () => void;
  onComplete: () => void;
};

export function TutorialCoach({
  hintId,
  onSkip,
  onComplete,
}: TutorialCoachProps) {
  const settledRef = useRef(false);
  const step = hintId ? COACH_STEPS[hintId] : null;

  return (
    <Joyride
      key={hintId ?? "idle"}
      run={step !== null}
      steps={step ? [step] : []}
      continuous
      scrollToFirstStep
      tooltipComponent={CoachTooltip}
      locale={{
        last: "Got it",
        next: "Got it",
        skip: "Skip",
      }}
      options={{
        skipBeacon: true,
        zIndex: 140,
        overlayClickAction: "close",
        dismissKeyAction: "close",
        spotlightPadding: 8,
        spotlightRadius: 6,
        targetWaitTimeout: 2500,
        arrowColor: "var(--border)",
      }}
      styles={{
        overlay: {
          backgroundColor: "rgba(0, 0, 0, 0.55)",
        },
      }}
      onEvent={(data) => {
        if (settledRef.current) return;
        if (data.status === STATUS.SKIPPED) {
          settledRef.current = true;
          onSkip();
          return;
        }
        if (data.status === STATUS.FINISHED) {
          settledRef.current = true;
          onComplete();
        }
      }}
    />
  );
}
