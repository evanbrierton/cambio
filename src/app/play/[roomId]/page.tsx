"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { use, useEffect } from "react";
import { GameTable } from "@/components/game/GameTable";
import type { PlayerView } from "@/game/types";
import { type SessionMode, useGameConnection } from "@/hooks/useGameConnection";
import { useThemeVoice } from "@/hooks/useThemeVoice";

function allowsPageScroll(view: PlayerView | null): boolean {
  if (!view) return true;
  return view.isWaiting || view.phase === "lobby" || view.phase === "ended";
}

export default function PlayPage({
  params,
}: {
  params: Promise<{ roomId: string }>;
}) {
  const { roomId } = use(params);
  const searchParams = useSearchParams();
  const router = useRouter();
  const voice = useThemeVoice();
  const name = searchParams.get("name") ?? "Player";
  const isNavFresh = searchParams.has("host") || searchParams.has("join");
  const sessionMode: SessionMode = isNavFresh ? "new" : "reconnect";

  const {
    connected,
    view,
    error,
    fleetingPeek,
    peekFlash,
    swapFlash,
    penaltyFlash,
    cambioFlash,
    send,
  } = useGameConnection(roomId, name, sessionMode);

  useEffect(() => {
    if (!view || !isNavFresh) return;
    const params = new URLSearchParams({ name });
    router.replace(`/play/${roomId}?${params.toString()}`);
  }, [view, isNavFresh, name, roomId, router]);

  const pageScrollable = allowsPageScroll(view);

  useEffect(() => {
    if (pageScrollable) {
      document.documentElement.classList.remove("play-scroll-lock");
    } else {
      document.documentElement.classList.add("play-scroll-lock");
    }
    return () => {
      document.documentElement.classList.remove("play-scroll-lock");
    };
  }, [pageScrollable]);

  if (!view) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6">
        {error ? (
          <p className="font-display text-sm text-red-400 text-center">
            {error}
          </p>
        ) : (
          <p className="font-display text-theme animate-pulse text-sm">
            {voice.loading}
          </p>
        )}
      </div>
    );
  }

  return (
    <div
      className={`play-shell touch-game fixed inset-0 z-10 flex flex-col px-3 sm:px-6 lg:px-8 ${
        pageScrollable
          ? "overflow-y-auto mobile-game-scroll"
          : "overflow-hidden"
      }`}
    >
      <GameTable
        view={view}
        connected={connected}
        error={error}
        fleetingPeek={fleetingPeek}
        peekFlash={peekFlash}
        swapFlash={swapFlash}
        penaltyFlash={penaltyFlash}
        cambioFlash={cambioFlash}
        send={send}
      />
    </div>
  );
}
