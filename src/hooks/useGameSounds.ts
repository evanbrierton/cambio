"use client";

import { useEffect, useRef } from "react";
import type { PlayerView } from "@/game/types";
import type {
  CambioFlash,
  FleetingPeek,
  PeekFlash,
  SwapFlash,
} from "@/hooks/useGameConnection";
import { playSound } from "@/lib/sounds";

export function useGameSounds(
  view: PlayerView | null,
  error: string | null,
  fleetingPeek: FleetingPeek | null,
  peekFlash: PeekFlash | null,
  swapFlash: SwapFlash | null,
  cambioFlash: CambioFlash | null,
) {
  const prevPhase = useRef<PlayerView["phase"] | null>(null);
  const prevLogLen = useRef(0);
  const prevMyTurn = useRef(false);
  const peekKey = useRef<string | null>(null);
  const peekFlashKey = useRef<string | null>(null);
  const swapFlashKey = useRef<string | null>(null);
  const cambioFlashKey = useRef<string | null>(null);

  useEffect(() => {
    if (!fleetingPeek) {
      peekKey.current = null;
      return;
    }
    const key = `${fleetingPeek.playerId}-${fleetingPeek.slot}`;
    if (peekKey.current === key) return;
    peekKey.current = key;
    playSound("flip");
  }, [fleetingPeek]);

  useEffect(() => {
    if (!peekFlash) {
      peekFlashKey.current = null;
      return;
    }
    const key = `${peekFlash.kind}-${peekFlash.actorId}-${peekFlash.playerId}-${peekFlash.slot}`;
    if (peekFlashKey.current === key) return;
    peekFlashKey.current = key;
    playSound(peekFlash.kind === "spy" ? "spy" : "peek");
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
    playSound("swap");
  }, [swapFlash]);

  useEffect(() => {
    if (!cambioFlash) {
      cambioFlashKey.current = null;
      return;
    }
    if (cambioFlashKey.current === cambioFlash.playerId) return;
    cambioFlashKey.current = cambioFlash.playerId;
    playSound("cambio");
  }, [cambioFlash]);

  useEffect(() => {
    if (!error?.includes("Wrong snap")) return;
    playSound("snapWrong");
  }, [error]);

  useEffect(() => {
    if (!view) return;

    if (view.phase === "ended" && prevPhase.current !== "ended") {
      playSound("gameOver");
    }
    prevPhase.current = view.phase;

    const me = view.players.find((p) => p.id === view.playerId);
    const isMyTurn = me?.isCurrentTurn ?? false;
    if (
      isMyTurn &&
      !prevMyTurn.current &&
      (view.phase === "playing" || view.phase === "cambio_final")
    ) {
      playSound("yourTurn");
    }
    prevMyTurn.current = isMyTurn;

    if (view.log.length > prevLogLen.current) {
      const lastLog = view.log[view.log.length - 1] ?? "";
      if (lastLog.includes("snapped correctly")) playSound("snap");
      else if (lastLog.includes("drew from") || lastLog.includes("discarded")) {
        playSound("draw");
      }
    }
    prevLogLen.current = view.log.length;
  }, [view]);
}
