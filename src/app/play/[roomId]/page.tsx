"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { use, useEffect } from "react";
import { GameTable } from "@/components/game/GameTable";
import { useThemeVoice } from "@/hooks/useThemeVoice";
import { useGameConnection, type SessionMode } from "@/hooks/useGameConnection";

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

  const { connected, view, error, fleetingPeek, send } = useGameConnection(
    roomId,
    name,
    sessionMode,
  );

  useEffect(() => {
    if (!view || !isNavFresh) return;
    const params = new URLSearchParams({ name });
    router.replace(`/play/${roomId}?${params.toString()}`);
  }, [view, isNavFresh, name, roomId, router]);

  if (!view) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <p className="font-display text-theme animate-pulse text-sm">
          {voice.loading}
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-1 w-full px-3 py-4 sm:px-6 sm:py-6 lg:px-8">
      <GameTable
        view={view}
        connected={connected}
        error={error}
        fleetingPeek={fleetingPeek}
        send={send}
      />
    </div>
  );
}
