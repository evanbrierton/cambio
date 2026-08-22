"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { use, useEffect, useMemo, useState } from "react";
import { GameTable } from "@/components/game/GameTable";
import { SwipeToLeave } from "@/components/SwipeToLeave";
import type { PlayerView } from "@/game/types";
import { DEFAULT_BOT_COUNT, parseBotDifficulty } from "@/game/types";
import {
  type MatchOptions,
  type SessionMode,
  type SoloOptions,
  useGameConnection,
} from "@/hooks/useGameConnection";
import { useThemeVoice } from "@/hooks/useThemeVoice";
import { appendDebugQueryParam, hasDebugQueryParam } from "@/lib/debug";
import {
  useRehydrateUiPrefs,
  useUiPrefs,
} from "@/store/ui-prefs";

/** Delay before showing the connecting indicator so fast failures go straight to error. */
const CONNECTING_UI_DELAY_MS = 300;

/** Mobile grid is 2 columns; at this count seats need vertical scroll into the chin. */
const GRID_CHIN_FILL_MIN_PLAYERS = 5;

function allowsPageScroll(view: PlayerView | null): boolean {
  if (!view) return true;
  return view.isWaiting || view.phase === "lobby" || view.phase === "ended";
}

function shouldFillChin(
  view: PlayerView | null,
  playerGridEnabled: boolean,
): boolean {
  if (!view || allowsPageScroll(view) || !playerGridEnabled) return false;
  const seatCount = view.players.filter((player) => !player.isWaiting).length;
  return seatCount >= GRID_CHIN_FILL_MIN_PLAYERS;
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
  useRehydrateUiPrefs();
  const { playerGridEnabled } = useUiPrefs();
  const name = searchParams.get("name")?.trim() ?? "";
  const debugEnabled = hasDebugQueryParam(searchParams);
  const isNavFresh = searchParams.has("host") || searchParams.has("join");
  const sessionMode: SessionMode = isNavFresh ? "new" : "reconnect";
  const isSolo = searchParams.get("solo") === "1";
  const isMatchmade = searchParams.get("match") === "1";
  const soloBotCount =
    Number.parseInt(
      searchParams.get("bots") ?? String(DEFAULT_BOT_COUNT),
      10,
    ) || DEFAULT_BOT_COUNT;
  const soloDifficulty = parseBotDifficulty(searchParams.get("difficulty"));
  const matchTargetSize =
    Number.parseInt(searchParams.get("targetSize") ?? "4", 10) || 4;
  const matchFillWithBots = searchParams.get("fillWithBots") !== "0";

  const soloOptions: SoloOptions | undefined = useMemo(
    () =>
      isSolo && isNavFresh
        ? {
            botCount: soloBotCount,
            difficulty: soloDifficulty,
          }
        : undefined,
    [isSolo, isNavFresh, soloBotCount, soloDifficulty],
  );
  const matchOptions: MatchOptions | undefined = useMemo(
    () =>
      isMatchmade
        ? {
            targetSize: matchTargetSize,
            fillWithBots: matchFillWithBots,
          }
        : undefined,
    [isMatchmade, matchTargetSize, matchFillWithBots],
  );

  useEffect(() => {
    if (isNavFresh && !name) {
      router.replace("/");
    }
  }, [isNavFresh, name, router]);

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
  } = useGameConnection(
    roomId,
    name,
    sessionMode,
    soloOptions,
    debugEnabled,
    matchOptions,
  );

  const [showConnecting, setShowConnecting] = useState(false);

  useEffect(() => {
    if (!view || !isNavFresh) return;
    const params = new URLSearchParams({ name });
    // Keep host/join so sessionMode does not flip and reconnect the socket.
    if (searchParams.has("host")) params.set("host", "1");
    if (searchParams.has("join")) params.set("join", "1");
    if (isMatchmade) {
      params.set("match", "1");
      params.set("targetSize", String(matchTargetSize));
      params.set("fillWithBots", matchFillWithBots ? "1" : "0");
    }
    if (isSolo) {
      params.set("solo", "1");
      params.set("bots", String(soloBotCount));
      params.set("difficulty", soloDifficulty);
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
    isMatchmade,
    isSolo,
    matchTargetSize,
    matchFillWithBots,
    soloBotCount,
    soloDifficulty,
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
  const fillChin = shouldFillChin(view, playerGridEnabled);

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
    <SwipeToLeave
      enabled={view.phase === "lobby" || view.isWaiting}
      label={voice.leaveGame}
      className="fixed inset-0 z-10"
    >
      <div
        className={`play-shell touch-game flex h-full w-full flex-col px-3 sm:px-6 lg:px-8 ${
          pageScrollable
            ? "overflow-y-auto overflow-x-hidden mobile-game-scroll"
            : fillChin
              ? "play-shell-fill-chin overflow-hidden"
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
        />
      </div>
    </SwipeToLeave>
  );
}
