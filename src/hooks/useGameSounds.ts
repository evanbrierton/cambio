"use client";

import { triggerHaptic } from "@cambio/client";
import { useEffect, useRef } from "react";
import type { PlayerView } from "@/game/types";
import type {
  CambioFlash,
  FleetingPeek,
  PeekFlash,
  ReshuffleFlash,
  SnapFlash,
  SwapFlash,
  TakeFlash,
} from "@/hooks/useGameConnection";
import { hapticKindForSound } from "@/lib/haptics";
import { playSound, type SoundId } from "@/lib/sounds";

function playFeedback(id: SoundId): void {
  playSound(id);
  const kind = hapticKindForSound(id);
  if (kind) void triggerHaptic(kind);
}

export function useGameSounds(
  view: PlayerView | null,
  error: string | null,
  fleetingPeek: FleetingPeek | null,
  peekFlash: PeekFlash | null,
  swapFlash: SwapFlash | null,
  cambioFlash: CambioFlash | null,
  reshuffleFlash: ReshuffleFlash | null,
  snapWindowSeconds: number | null,
  takeFlash: TakeFlash | null = null,
  snapFlash: SnapFlash | null = null,
) {
  const prevPhase = useRef<PlayerView["phase"] | null>(null);
  const prevLogLen = useRef(0);
  const prevMyTurn = useRef(false);
  const peekKey = useRef<string | null>(null);
  const peekFlashKey = useRef<string | null>(null);
  const swapFlashKey = useRef<string | null>(null);
  const takeFlashKey = useRef<string | null>(null);
  const snapFlashKey = useRef<string | null>(null);
  const cambioFlashKey = useRef<string | null>(null);
  const reshuffleFlashKey = useRef<number | null>(null);
  const prevSnapSeconds = useRef<number | null>(null);

  useEffect(() => {
    if (!fleetingPeek) {
      peekKey.current = null;
      return;
    }
    const key = `${fleetingPeek.playerId}-${fleetingPeek.slot}`;
    if (peekKey.current === key) return;
    peekKey.current = key;
    playFeedback("flip");
  }, [fleetingPeek]);

  useEffect(() => {
    if (!peekFlash) {
      peekFlashKey.current = null;
      return;
    }
    const key = `${peekFlash.kind}-${peekFlash.actorId}-${peekFlash.playerId}-${peekFlash.slot}`;
    if (peekFlashKey.current === key) return;
    peekFlashKey.current = key;
    playFeedback(peekFlash.kind === "spy" ? "spy" : "peek");
  }, [peekFlash]);

  useEffect(() => {
    if (!swapFlash) {
      swapFlashKey.current = null;
      return;
    }
    const key = swapFlash.slots
      .map((slot) => `${slot.playerId}-${slot.slot}`)
      .sort()
      .join("|");
    if (swapFlashKey.current === key) return;
    swapFlashKey.current = key;
    playFeedback("swap");
  }, [swapFlash]);

  useEffect(() => {
    if (!takeFlash) {
      takeFlashKey.current = null;
      return;
    }
    const key = `${takeFlash.playerId}-${takeFlash.slot}`;
    if (takeFlashKey.current === key) return;
    takeFlashKey.current = key;
    playFeedback("take");
  }, [takeFlash]);

  useEffect(() => {
    if (!snapFlash) {
      snapFlashKey.current = null;
      return;
    }
    const key = `${snapFlash.actorId}-${snapFlash.playerId}-${snapFlash.slot}`;
    if (snapFlashKey.current === key) return;
    snapFlashKey.current = key;
    playFeedback("snap");
  }, [snapFlash]);

  useEffect(() => {
    if (!cambioFlash) {
      cambioFlashKey.current = null;
      return;
    }
    if (cambioFlashKey.current === cambioFlash.playerId) return;
    cambioFlashKey.current = cambioFlash.playerId;
    playFeedback("cambio");
  }, [cambioFlash]);

  useEffect(() => {
    if (!reshuffleFlash) {
      reshuffleFlashKey.current = null;
      return;
    }
    if (reshuffleFlashKey.current === reshuffleFlash.id) return;
    reshuffleFlashKey.current = reshuffleFlash.id;
    playFeedback("reshuffle");
  }, [reshuffleFlash]);

  useEffect(() => {
    if (!error?.includes("Wrong snap")) return;
    playFeedback("snapWrong");
  }, [error]);

  useEffect(() => {
    if (!view) return;

    if (view.phase === "snap_window" && prevPhase.current !== "snap_window") {
      playFeedback("snapWindowStart");
    }

    if (view.phase === "ended" && prevPhase.current !== "ended") {
      playFeedback("gameOver");
    }
    prevPhase.current = view.phase;

    const me = view.players.find((p) => p.id === view.playerId);
    const isMyTurn = me?.isCurrentTurn ?? false;
    if (
      isMyTurn &&
      !prevMyTurn.current &&
      (view.phase === "playing" || view.phase === "cambio_final")
    ) {
      playFeedback("yourTurn");
    }
    prevMyTurn.current = isMyTurn;

    if (view.log.length > prevLogLen.current) {
      const lastLog = view.log[view.log.length - 1] ?? "";
      // Successful snaps play via snapFlash; wrong snaps use error → snapWrong.
      if (lastLog.includes("drew from the discard")) {
        playFeedback("discardDraw");
      } else if (lastLog.includes("drew from")) {
        playFeedback("deckDraw");
      } else if (lastLog.includes("discarded")) {
        playFeedback("take");
      }
    }
    prevLogLen.current = view.log.length;
  }, [view]);

  useEffect(() => {
    if (view?.phase !== "snap_window" || snapWindowSeconds === null) {
      prevSnapSeconds.current = null;
      return;
    }

    if (
      prevSnapSeconds.current !== null &&
      snapWindowSeconds < prevSnapSeconds.current &&
      snapWindowSeconds > 0
    ) {
      playFeedback("snapCountdown");
    }
    prevSnapSeconds.current = snapWindowSeconds;
  }, [view?.phase, snapWindowSeconds]);
}
