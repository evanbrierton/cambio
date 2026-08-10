"use client";

import Link from "next/link";
import { ThemePicker } from "@/components/ui/ThemePicker";
import type { PlayerView } from "@/game/types";
import { useThemeVoice } from "@/hooks/useThemeVoice";

interface WaitingScreenProps {
  view: PlayerView;
  connected: boolean;
}

export function WaitingScreen({ view, connected }: WaitingScreenProps) {
  const voice = useThemeVoice();

  return (
    <div className="w-full max-w-lg mx-auto flex flex-col gap-6 py-8 px-4">
      <header className="text-center">
        <p className="font-display text-theme-muted text-[10px]">
          {voice.roomPrefix} {view.roomId.toUpperCase()}
        </p>
        <h1 className="font-display text-xl sm:text-2xl title-glow mt-2">
          {voice.waitingTitle}
        </h1>
        <p className="text-sm text-theme-muted mt-3 normal-case tracking-normal">
          {voice.waitingSubtitle}
        </p>
        <p className="font-display text-[10px] text-theme-muted mt-2">
          {connected ? voice.online : voice.reconnecting}
        </p>
      </header>

      <div className="pixel-border p-5 bg-surface-elevated text-center">
        <p className="font-display text-xs text-accent-alt animate-pulse">
          {voice.waitingInLobby}
        </p>
        <ul className="mt-4 space-y-2 text-xs text-theme">
          {view.players
            .filter((p) => !p.isWaiting)
            .map((p) => (
              <li key={p.id} className="player-name text-xs">
                {p.name}
                {p.isCurrentTurn ? ` — ${voice.turn}` : ""}
              </li>
            ))}
        </ul>
      </div>

      <div className="flex flex-col gap-4">
        <ThemePicker compact={true} />
        <Link
          href="/"
          className="chip-btn text-center text-[10px] px-3 py-2 border-theme-muted text-theme hover:border-accent transition-colors"
        >
          {voice.leaveGame}
        </Link>
      </div>
    </div>
  );
}
