export type SoundId =
  | "flip"
  | "peek"
  | "spy"
  | "snap"
  | "snapWrong"
  | "snapWindowStart"
  | "snapCountdown"
  | "draw"
  | "swap"
  | "cambio"
  | "gameOver"
  | "yourTurn"
  | "click"
  | "chat";

import { useUiPrefsStore } from "@/store/ui-prefs";

let audioCtx: AudioContext | null = null;

function getCtx(): AudioContext | null {
  if (typeof document === "undefined") {
    return null;
  }
  if (!audioCtx) {
    audioCtx = new AudioContext();
  }
  return audioCtx;
}

async function resumeCtx(): Promise<AudioContext | null> {
  const ctx = getCtx();
  if (!ctx) {
    return null;
  }
  if (ctx.state === "suspended") {
    await ctx.resume();
  }
  return ctx;
}

function tone({
  ctx,
  freq,
  start,
  duration,
  type = "square",
  volume = 0.06,
  gainEnd = 0.001,
}: {
  ctx: AudioContext;
  freq: number;
  start: number;
  duration: number;
  type?: OscillatorType;
  volume?: number;
  gainEnd?: number;
}) {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  gain.gain.setValueAtTime(volume, start);
  gain.gain.exponentialRampToValueAtTime(gainEnd, start + duration);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(start);
  osc.stop(start + duration + 0.02);
}

export async function playSound(id: SoundId): Promise<void> {
  if (!useUiPrefsStore.getState().soundEnabled) {
    return;
  }
  const ctx = await resumeCtx();
  if (!ctx) {
    return;
  }

  const t = ctx.currentTime;

  switch (id) {
    case "flip":
      tone({
        ctx,
        freq: 440,
        start: t,
        duration: 0.06,
        type: "square",
        volume: 0.05,
      });
      tone({
        ctx,
        freq: 660,
        start: t + 0.07,
        duration: 0.08,
        type: "square",
        volume: 0.04,
      });
      break;
    case "peek":
      tone({
        ctx,
        freq: 620,
        start: t,
        duration: 0.05,
        type: "sine",
        volume: 0.05,
      });
      tone({
        ctx,
        freq: 880,
        start: t + 0.06,
        duration: 0.1,
        type: "sine",
        volume: 0.04,
      });
      break;
    case "spy":
      tone({
        ctx,
        freq: 520,
        start: t,
        duration: 0.04,
        type: "triangle",
        volume: 0.05,
      });
      tone({
        ctx,
        freq: 780,
        start: t + 0.05,
        duration: 0.07,
        type: "triangle",
        volume: 0.05,
      });
      tone({
        ctx,
        freq: 1040,
        start: t + 0.1,
        duration: 0.08,
        type: "triangle",
        volume: 0.04,
      });
      break;
    case "snap":
      tone({
        ctx,
        freq: 880,
        start: t,
        duration: 0.05,
        type: "square",
        volume: 0.07,
      });
      tone({
        ctx,
        freq: 1320,
        start: t + 0.04,
        duration: 0.1,
        type: "square",
        volume: 0.05,
      });
      break;
    case "snapWrong":
      tone({
        ctx,
        freq: 180,
        start: t,
        duration: 0.15,
        type: "sawtooth",
        volume: 0.08,
      });
      tone({
        ctx,
        freq: 120,
        start: t + 0.1,
        duration: 0.2,
        type: "sawtooth",
        volume: 0.06,
      });
      break;
    case "snapWindowStart":
      tone({
        ctx,
        freq: 440,
        start: t,
        duration: 0.08,
        type: "square",
        volume: 0.07,
      });
      tone({
        ctx,
        freq: 660,
        start: t + 0.1,
        duration: 0.1,
        type: "square",
        volume: 0.08,
      });
      tone({
        ctx,
        freq: 880,
        start: t + 0.22,
        duration: 0.14,
        type: "square",
        volume: 0.09,
      });
      break;
    case "snapCountdown":
      tone({
        ctx,
        freq: 740,
        start: t,
        duration: 0.05,
        type: "square",
        volume: 0.06,
      });
      tone({
        ctx,
        freq: 980,
        start: t + 0.05,
        duration: 0.07,
        type: "square",
        volume: 0.05,
      });
      break;
    case "draw":
      tone({
        ctx,
        freq: 520,
        start: t,
        duration: 0.04,
        type: "triangle",
        volume: 0.05,
      });
      tone({
        ctx,
        freq: 390,
        start: t + 0.05,
        duration: 0.06,
        type: "triangle",
        volume: 0.04,
      });
      break;
    case "swap":
      tone({
        ctx,
        freq: 330,
        start: t,
        duration: 0.05,
        type: "triangle",
        volume: 0.05,
      });
      tone({
        ctx,
        freq: 494,
        start: t + 0.07,
        duration: 0.08,
        type: "triangle",
        volume: 0.05,
      });
      tone({
        ctx,
        freq: 392,
        start: t + 0.14,
        duration: 0.06,
        type: "triangle",
        volume: 0.04,
      });
      break;
    case "cambio":
      tone({
        ctx,
        freq: 523,
        start: t,
        duration: 0.1,
        type: "square",
        volume: 0.09,
      });
      tone({
        ctx,
        freq: 659,
        start: t + 0.1,
        duration: 0.1,
        type: "square",
        volume: 0.09,
      });
      tone({
        ctx,
        freq: 784,
        start: t + 0.2,
        duration: 0.1,
        type: "square",
        volume: 0.09,
      });
      tone({
        ctx,
        freq: 1047,
        start: t + 0.3,
        duration: 0.2,
        type: "square",
        volume: 0.1,
      });
      tone({
        ctx,
        freq: 1319,
        start: t + 0.45,
        duration: 0.35,
        type: "square",
        volume: 0.08,
      });
      tone({
        ctx,
        freq: 784,
        start: t + 0.1,
        duration: 0.5,
        type: "triangle",
        volume: 0.04,
      });
      break;
    case "gameOver":
      tone({
        ctx,
        freq: 392,
        start: t,
        duration: 0.12,
        type: "triangle",
        volume: 0.06,
      });
      tone({
        ctx,
        freq: 330,
        start: t + 0.12,
        duration: 0.12,
        type: "triangle",
        volume: 0.05,
      });
      tone({
        ctx,
        freq: 523,
        start: t + 0.28,
        duration: 0.2,
        type: "triangle",
        volume: 0.06,
      });
      break;
    case "yourTurn":
      tone({
        ctx,
        freq: 740,
        start: t,
        duration: 0.08,
        type: "sine",
        volume: 0.04,
      });
      break;
    case "click":
      tone({
        ctx,
        freq: 600,
        start: t,
        duration: 0.03,
        type: "square",
        volume: 0.03,
      });
      break;
    case "chat":
      tone({
        ctx,
        freq: 880,
        start: t,
        duration: 0.04,
        type: "sine",
        volume: 0.035,
      });
      tone({
        ctx,
        freq: 1100,
        start: t + 0.05,
        duration: 0.06,
        type: "sine",
        volume: 0.03,
      });
      break;
    default: {
      const _exhaustive: never = id;
      return _exhaustive;
    }
  }
}
