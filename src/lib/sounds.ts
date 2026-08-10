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
  if (typeof window === "undefined") {
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

function tone(
  ctx: AudioContext,
  freq: number,
  start: number,
  duration: number,
  type: OscillatorType = "square",
  volume = 0.06,
  gainEnd = 0.001,
) {
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
      tone(ctx, 440, t, 0.06, "square", 0.05);
      tone(ctx, 660, t + 0.07, 0.08, "square", 0.04);
      break;
    case "peek":
      tone(ctx, 620, t, 0.05, "sine", 0.05);
      tone(ctx, 880, t + 0.06, 0.1, "sine", 0.04);
      break;
    case "spy":
      tone(ctx, 520, t, 0.04, "triangle", 0.05);
      tone(ctx, 780, t + 0.05, 0.07, "triangle", 0.05);
      tone(ctx, 1040, t + 0.1, 0.08, "triangle", 0.04);
      break;
    case "snap":
      tone(ctx, 880, t, 0.05, "square", 0.07);
      tone(ctx, 1320, t + 0.04, 0.1, "square", 0.05);
      break;
    case "snapWrong":
      tone(ctx, 180, t, 0.15, "sawtooth", 0.08);
      tone(ctx, 120, t + 0.1, 0.2, "sawtooth", 0.06);
      break;
    case "snapWindowStart":
      tone(ctx, 440, t, 0.08, "square", 0.07);
      tone(ctx, 660, t + 0.1, 0.1, "square", 0.08);
      tone(ctx, 880, t + 0.22, 0.14, "square", 0.09);
      break;
    case "snapCountdown":
      tone(ctx, 740, t, 0.05, "square", 0.06);
      tone(ctx, 980, t + 0.05, 0.07, "square", 0.05);
      break;
    case "draw":
      tone(ctx, 520, t, 0.04, "triangle", 0.05);
      tone(ctx, 390, t + 0.05, 0.06, "triangle", 0.04);
      break;
    case "swap":
      tone(ctx, 330, t, 0.05, "triangle", 0.05);
      tone(ctx, 494, t + 0.07, 0.08, "triangle", 0.05);
      tone(ctx, 392, t + 0.14, 0.06, "triangle", 0.04);
      break;
    case "cambio":
      tone(ctx, 523, t, 0.1, "square", 0.09);
      tone(ctx, 659, t + 0.1, 0.1, "square", 0.09);
      tone(ctx, 784, t + 0.2, 0.1, "square", 0.09);
      tone(ctx, 1047, t + 0.3, 0.2, "square", 0.1);
      tone(ctx, 1319, t + 0.45, 0.35, "square", 0.08);
      tone(ctx, 784, t + 0.1, 0.5, "triangle", 0.04);
      break;
    case "gameOver":
      tone(ctx, 392, t, 0.12, "triangle", 0.06);
      tone(ctx, 330, t + 0.12, 0.12, "triangle", 0.05);
      tone(ctx, 523, t + 0.28, 0.2, "triangle", 0.06);
      break;
    case "yourTurn":
      tone(ctx, 740, t, 0.08, "sine", 0.04);
      break;
    case "click":
      tone(ctx, 600, t, 0.03, "square", 0.03);
      break;
    case "chat":
      tone(ctx, 880, t, 0.04, "sine", 0.035);
      tone(ctx, 1100, t + 0.05, 0.06, "sine", 0.03);
      break;
  }
}
