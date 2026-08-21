"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { use, useEffect, useMemo, useState } from "react";
import { GameTable } from "@/components/game/GameTable";
import type { PlayerView } from "@/game/types";
import {
  parseBotDifficulty,
  parseLobbyNetwork,
  parseLobbyVisibility,
} from "@/game/types";
import {
  type LobbyConnectOptions,
  type SessionMode,
  useGameConnection,
} from "@/hooks/useGameConnection";
import { useP2PConnection } from "@/hooks/useP2PConnection";
import { useThemeVoice } from "@/hooks/useThemeVoice";
import { appendDebugQueryParam, hasDebugQueryParam } from "@/lib/debug";

/** Delay before showing the connecting indicator so fast failures go straight to error. */
const CONNECTING_UI_DELAY_MS = 300;

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
  const name = searchParams.get("name")?.trim() ?? "";
  const debugEnabled = hasDebugQueryParam(searchParams);
  const isNavFresh = searchParams.has("host") || searchParams.has("join");
  const sessionMode: SessionMode = isNavFresh ? "new" : "reconnect";
  const network = parseLobbyNetwork(
    searchParams.get("network") ??
      (searchParams.get("mode") === "local" ? "nearby" : null),
  );
  const visibility =
    searchParams.get("match") === "1"
      ? ("public" as const)
      : parseLobbyVisibility(searchParams.get("visibility"));
  const seedBotCount =
    Number.parseInt(searchParams.get("bots") ?? "0", 10) || 0;
  const difficulty = parseBotDifficulty(searchParams.get("difficulty"));
  const matchTargetSize =
    Number.parseInt(searchParams.get("targetSize") ?? "4", 10) || 4;
  const matchFillWithBots = searchParams.get("fillWithBots") !== "0";
  const nearbyEndpoint = searchParams.get("endpoint") ?? undefined;
  const isNearby = network === "nearby";
  const isNearbyHost = isNearby && searchParams.has("host");

  const lobbyOptions: LobbyConnectOptions | undefined = useMemo(
    () =>
      isNearby
        ? undefined
        : {
            network: "online",
            visibility,
            seedBotCount: isNavFresh ? seedBotCount : 0,
            difficulty,
            targetSize: matchTargetSize,
            fillWithBots: matchFillWithBots,
          },
    [
      isNearby,
      visibility,
      isNavFresh,
      seedBotCount,
      difficulty,
      matchTargetSize,
      matchFillWithBots,
    ],
  );

  useEffect(() => {
    if (isNavFresh && !name) {
      router.replace("/");
    }
  }, [isNavFresh, name, router]);

  const online = useGameConnection(
    roomId,
    name,
    sessionMode,
    lobbyOptions,
    debugEnabled,
    !isNearby,
  );

  const nearby = useP2PConnection(roomId, name, {
    enabled: isNearby,
    role: isNearbyHost ? "host" : "guest",
    endpoint: nearbyEndpoint,
    seedBotCount: isNavFresh ? seedBotCount : 0,
    difficulty,
  });

  const {
    connected,
    view,
    error,
    fleetingPeek,
    peekFlash,
    swapFlash,
    takeFlash,
    snapFlash,
    penaltyFlash,
    cambioFlash,
    reshuffleFlash,
    discardDrawFlash,
    deckDrawFlash,
    send,
  } = isNearby ? nearby : online;

  const lanEndpoint = isNearby ? nearby.lanEndpoint : null;

  const [showConnecting, setShowConnecting] = useState(false);

  useEffect(() => {
    if (!view || !isNavFresh) return;
    const params = new URLSearchParams({ name });
    if (searchParams.has("host")) params.set("host", "1");
    if (searchParams.has("join")) params.set("join", "1");
    if (isNearby) {
      params.set("network", "nearby");
      if (nearbyEndpoint) params.set("endpoint", nearbyEndpoint);
    } else {
      params.set("network", "online");
      params.set("visibility", visibility);
      if (visibility === "public") {
        params.set("match", "1");
        params.set("targetSize", String(matchTargetSize));
        params.set("fillWithBots", matchFillWithBots ? "1" : "0");
      }
      if (seedBotCount > 0) {
        params.set("bots", String(seedBotCount));
        params.set("difficulty", difficulty);
      }
    }
    if (debugEnabled) appendDebugQueryParam(params);
    const next = params.toString();
    const current = searchParams.toString();
    if (next === current) return;
    router.replace(`/play/${roomId}?${next}`);
  }, [
    debugEnabled,
    view,
    isNavFresh,
    isNearby,
    visibility,
    matchTargetSize,
    matchFillWithBots,
    seedBotCount,
    difficulty,
    nearbyEndpoint,
    name,
    roomId,
    router,
    searchParams,
  ]);

  useEffect(() => {
    if (view || error) {
      setShowConnecting(false);
      return;
    }
    const timer = window.setTimeout(() => {
      setShowConnecting(true);
    }, CONNECTING_UI_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, [view, error]);

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
        ) : showConnecting ? (
          <p className="font-display text-theme animate-pulse text-sm">
            {voice.loading}
          </p>
        ) : null}
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
        takeFlash={takeFlash}
        snapFlash={snapFlash}
        penaltyFlash={penaltyFlash}
        cambioFlash={cambioFlash}
        reshuffleFlash={reshuffleFlash}
        discardDrawFlash={discardDrawFlash}
        deckDrawFlash={deckDrawFlash}
        send={send}
        lanEndpoint={lanEndpoint}
      />
    </div>
  );
}
