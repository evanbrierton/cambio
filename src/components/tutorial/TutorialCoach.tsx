"use client";

import { useMemo, useRef } from "react";
import {
  ACTIONS,
  type EventData,
  Joyride,
  ORIGIN,
  STATUS,
  type TooltipRenderProps,
} from "react-joyride";
import { useThemeVoice } from "@/hooks/useThemeVoice";
import { type CoachHintId, isCoachEligiblePhase } from "@/lib/coach-moments";
import type { ThemeVoice } from "@/lib/themes";
import {
  TUTORIAL_DISMISS_REASON,
  TUTORIAL_STAGE,
  type TutorialDismissReason,
} from "@/lib/tutorial";
import { useTutorialStore } from "@/store/tutorial-prefs";

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
    "btn-theme text-[10px] sm:text-xs px-3 py-2 transition-colors active:opacity-80 w-full sm:w-auto";
  return (
    <div
      {...tooltipProps}
      className="pixel-border bg-surface-elevated p-3.5 sm:p-5 w-[min(95vw,22rem)] max-h-[min(72dvh,24rem)] overflow-y-auto shadow-glow-accent text-left font-display text-theme"
    >
      {step.title ? (
        <h3 className="font-display text-sm sm:text-base title-glow mb-1.5 sm:mb-2">
          {step.title}
        </h3>
      ) : null}
      <p className="font-display text-[11px] sm:text-xs text-theme leading-relaxed normal-case tracking-normal">
        {step.content}
      </p>
      <div className="mt-3 sm:mt-4 flex flex-col sm:flex-row sm:flex-wrap items-stretch sm:items-center gap-2">
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
          className={`${btnClass} btn-primary sm:ml-auto`}
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
  const markStageSeenFromDismiss = useTutorialStore(
    (state) => state.markStageSeenFromDismiss,
  );
  const settledRef = useRef(false);
  const step = useMemo(() => {
    if (!hintId) return null;
    return { ...COACH_LAYOUT[hintId], ...coachCopy(hintId, voice) };
  }, [hintId, voice]);

  const settleAsSeen = (reason: TutorialDismissReason) => {
    if (settledRef.current) return;
    settledRef.current = true;
    markStageSeenFromDismiss(TUTORIAL_STAGE.IN_GAME_COACH, reason);
  };

  const onCoachEvent = (data: EventData) => {
    if (settledRef.current) return;

    if (data.status === STATUS.FINISHED) {
      settleAsSeen(TUTORIAL_DISMISS_REASON.FINISH);
      onComplete();
      return;
    }

    if (data.status === STATUS.SKIPPED || data.action === ACTIONS.SKIP) {
      settleAsSeen(TUTORIAL_DISMISS_REASON.SKIP);
      onSkip();
      return;
    }

    if (data.action === ACTIONS.CLOSE) {
      const reason =
        data.origin === ORIGIN.KEYBOARD
          ? TUTORIAL_DISMISS_REASON.ESCAPE
          : TUTORIAL_DISMISS_REASON.TOUCH_DISMISS;
      settleAsSeen(reason);
      onSkip();
    }
  };

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
      onEvent={onCoachEvent}
    />
  );
}
