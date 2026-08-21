"use client";

import { useMemo, useRef } from "react";
import { Joyride, STATUS, type TooltipRenderProps } from "react-joyride";
import { useThemeVoice } from "@/hooks/useThemeVoice";
import { type CoachHintId, isCoachEligiblePhase } from "@/lib/coach-moments";
import type { ThemeVoice } from "@/lib/themes";

export type { CoachHintId };
export { isCoachEligiblePhase };

const COACH_LAYOUT: Record<
  CoachHintId,
  {
    target: string;
    skipBeacon: boolean;
    placement: "top" | "bottom";
  }
> = {
  "own-hand": {
    target: '[data-tutorial="own-hand"]',
    skipBeacon: true,
    placement: "top",
  },
  deck: {
    target: '[data-tutorial="deck"]',
    skipBeacon: true,
    placement: "bottom",
  },
  discard: {
    target: '[data-tutorial="discard"]',
    skipBeacon: true,
    placement: "bottom",
  },
  "call-cambio": {
    target: '[data-tutorial="call-cambio"]',
    skipBeacon: true,
    placement: "top",
  },
};

function coachCopy(
  hintId: CoachHintId,
  voice: ThemeVoice,
): { title: string; content: string } {
  switch (hintId) {
    case "own-hand":
      return { title: voice.coachHandTitle, content: voice.coachHandBody };
    case "deck":
      return { title: voice.coachDeckTitle, content: voice.coachDeckBody };
    case "discard":
      return {
        title: voice.coachDiscardTitle,
        content: voice.coachDiscardBody,
      };
    case "call-cambio":
      return { title: voice.coachCambioTitle, content: voice.coachCambioBody };
  }
}

function CoachTooltip({
  closeProps,
  primaryProps,
  skipProps,
  step,
  tooltipProps,
}: TooltipRenderProps) {
  const voice = useThemeVoice();
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
          {voice.coachSkip}
        </button>
        <button
          type="button"
          {...primaryProps}
          className={`${btnClass} btn-primary ml-auto`}
        >
          {voice.coachGotIt}
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
  const voice = useThemeVoice();
  const settledRef = useRef(false);
  const step = useMemo(() => {
    if (!hintId) return null;
    return { ...COACH_LAYOUT[hintId], ...coachCopy(hintId, voice) };
  }, [hintId, voice]);

  return (
    <Joyride
      key={hintId ?? "idle"}
      run={step !== null}
      steps={step ? [step] : []}
      continuous
      scrollToFirstStep
      tooltipComponent={CoachTooltip}
      locale={{
        last: voice.coachGotIt,
        next: voice.coachGotIt,
        skip: voice.coachSkip,
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
