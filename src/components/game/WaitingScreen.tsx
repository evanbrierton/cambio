"use client";

import { canUseNativeShare, shareRoomInvite } from "@cambio/client";
import { Check, Share2 } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { ThemePicker } from "@/components/ui/ThemePicker";
import type { PlayerView } from "@/game/types";
import { useThemeVoice } from "@/hooks/useThemeVoice";

type WaitingScreenProps = {
  view: PlayerView;
  connected: boolean;
};

export function WaitingScreen({ view, connected }: WaitingScreenProps) {
  const voice = useThemeVoice();
  const [inviteShared, setInviteShared] = useState(false);
  const nativeShareEnabled = canUseNativeShare();

  const shareInvite = () => {
    if (!nativeShareEnabled) return;
    const roomCode = view.roomId.toUpperCase();
    const roomUrl =
      typeof window === "undefined"
        ? null
        : new URL(`/play/${view.roomId}`, window.location.origin).toString();
    if (!roomUrl) return;
    void shareRoomInvite({ roomCode, roomUrl }).then((shared) => {
      if (!shared) return;
      setInviteShared(true);
      window.setTimeout(() => setInviteShared(false), 2000);
    });
  };

  return (
    <div className="w-full max-w-lg mx-auto flex flex-col gap-6 py-8 px-4">
      <header className="text-center">
        <div className="inline-flex items-center justify-center gap-2">
          <p className="font-display text-theme-muted text-[10px]">
            {voice.roomPrefix} {view.roomId.toUpperCase()}
          </p>
          {nativeShareEnabled ? (
            <button
              type="button"
              onClick={shareInvite}
              aria-live="polite"
              aria-label={inviteShared ? "Shared invite" : "Share invite"}
              title={inviteShared ? "Shared invite" : "Share invite"}
              className={`chip-btn chip-btn-sm inline-flex items-center justify-center px-1.5 border-theme-muted text-theme hover:border-accent transition-colors ${
                inviteShared ? "border-accent text-accent" : ""
              }`}
            >
              {inviteShared ? (
                <Check aria-hidden className="size-3.5 shrink-0" />
              ) : (
                <Share2 aria-hidden className="size-3.5 shrink-0" />
              )}
            </button>
          ) : null}
        </div>
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
        <ThemePicker compact />
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
