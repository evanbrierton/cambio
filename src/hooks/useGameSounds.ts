"use client";

import { useEffect, useRef } from "react";
import { playSound } from "@/lib/sounds";
import type { PlayerView } from "@/game/types";
import type { FleetingPeek } from "@/hooks/useGameConnection";

export function useGameSounds(
  view: PlayerView | null,
  error: string | null,
  fleetingPeek: FleetingPeek | null,
) {
  const prevPhase = useRef<PlayerView["phase"] | null>(null);
  const prevLogLen = useRef(0);
  const prevMyTurn = useRef(false);
  const peekKey = useRef<string | null>(null);

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
      else if (lastLog.includes("called CAMBIO")) playSound("cambio");
      else if (lastLog.includes("drew from") || lastLog.includes("discarded")) {
        playSound("draw");
      }
    }
    prevLogLen.current = view.log.length;
  }, [view]);
}
