"use client";

import { Joyride, STATUS, type TooltipRenderProps } from "react-joyride";

const COACH_STEPS = [
  {
    target: '[data-tutorial="own-hand"]',
    title: "Your hand",
    content:
      "These four face-down cards are yours. At setup, peek at two of them once — then rely on memory.",
    skipBeacon: true,
    placement: "top" as const,
  },
  {
    target: '[data-tutorial="deck"]',
    title: "Draw from the deck",
    content:
      "On your turn, draw from the deck or discard pile. From the deck you can swap or discard to trigger abilities.",
    skipBeacon: true,
    placement: "bottom" as const,
  },
  {
    target: '[data-tutorial="discard"]',
    title: "Discard pile & snap",
    content:
      "Cards land here face up. If you hold a matching rank, snap anytime to discard another card — wrong snaps cost a penalty.",
    skipBeacon: true,
    placement: "bottom" as const,
  },
  {
    target: '[data-tutorial="call-cambio"]',
    title: 'Call "Cambio"',
    content:
      "Happy with your hand? Call Cambio at the start of your turn before drawing. Everyone gets one last turn, then scores reveal.",
    skipBeacon: true,
    placement: "top" as const,
  },
];

function CoachTooltip({
  backProps,
  closeProps,
  index,
  isLastStep,
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
      className="pixel-border bg-surface-elevated p-4 sm:p-5 max-w-[min(92vw,22rem)] shadow-glow-accent text-left"
    >
      {step.title ? (
        <h3 className="font-display text-sm sm:text-base title-glow mb-2">
          {step.title}
        </h3>
      ) : null}
      <p className="text-xs sm:text-sm text-theme normal-case tracking-normal leading-relaxed">
        {step.content}
      </p>
      <div className="mt-4 flex flex-wrap items-center gap-2">
        {index > 0 ? (
          <button
            type="button"
            {...backProps}
            className={`${btnClass} btn-secondary`}
          >
            Back
          </button>
        ) : null}
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
          {isLastStep ? "Got it" : "Next"}
        </button>
        <button type="button" {...closeProps} className="sr-only">
          Close coach
        </button>
      </div>
    </div>
  );
}

type TutorialCoachProps = {
  run: boolean;
  onFinish: () => void;
};

export function TutorialCoach({ run, onFinish }: TutorialCoachProps) {
  return (
    <Joyride
      run={run}
      steps={COACH_STEPS}
      continuous
      scrollToFirstStep
      tooltipComponent={CoachTooltip}
      locale={{
        back: "Back",
        last: "Got it",
        next: "Next",
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
      }}
      styles={{
        overlay: {
          backgroundColor: "rgba(0, 0, 0, 0.55)",
        },
      }}
      onEvent={(data) => {
        const finished =
          data.status === STATUS.FINISHED || data.status === STATUS.SKIPPED;
        if (finished) {
          onFinish();
        }
      }}
    />
  );
}

export function isCoachEligiblePhase(phase: string): boolean {
  return (
    phase !== "lobby" &&
    phase !== "ended" &&
    phase !== "revealed" &&
    phase !== "waiting"
  );
}
