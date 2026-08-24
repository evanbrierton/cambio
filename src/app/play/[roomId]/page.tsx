"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { use, useEffect, useMemo, useState } from "react";
import { GameTable } from "@/components/game/GameTable";
import { SwipeToLeave } from "@/components/SwipeToLeave";
import type { ClientMessage, PlayerView } from "@/game/types";
import { DEFAULT_BOT_COUNT, parseBotDifficulty } from "@/game/types";
import {
  type MatchOptions,
  type SessionMode,
  type SoloOptions,
  useGameConnection,
} from "@/hooks/useGameConnection";
import { useP2PConnection } from "@/hooks/useP2PConnection";
import { useThemeVoice } from "@/hooks/useThemeVoice";
import { appendDebugQueryParam, hasDebugQueryParam } from "@/lib/debug";
import { shouldFillPlayShellChin } from "@/lib/play-shell-layout";
import { useRehydrateUiPrefs, useUiPrefs } from "@/store/ui-prefs";

/** Delay before showing the connecting indicator so fast failures go straight to error. */
const CONNECTING_UI_DELAY_MS = 300;

type GameConnectionState = {
  connected: boolean;
  view: PlayerView | null;
  error: string | null;
  fleetingPeek: ReturnType<typeof useGameConnection>["fleetingPeek"];
  peekFlash: ReturnType<typeof useGameConnection>["peekFlash"];
  swapFlash: ReturnType<typeof useGameConnection>["swapFlash"];
  takeFlash: ReturnType<typeof useGameConnection>["takeFlash"];
  snapFlash: ReturnType<typeof useGameConnection>["snapFlash"];
  penaltyFlash: ReturnType<typeof useGameConnection>["penaltyFlash"];
  cambioFlash: ReturnType<typeof useGameConnection>["cambioFlash"];
  reshuffleFlash: ReturnType<typeof useGameConnection>["reshuffleFlash"];
  discardDrawFlash: ReturnType<typeof useGameConnection>["discardDrawFlash"];
  deckDrawFlash: ReturnType<typeof useGameConnection>["deckDrawFlash"];
  send: (message: ClientMessage) => void;
};

function allowsPageScroll(view: PlayerView | null): boolean {
  if (!view) return true;
  return view.isWaiting || view.phase === "lobby" || view.phase === "ended";
}

type PlaySessionProps = {
  roomId: string;
  name: string;
  sessionMode: SessionMode;
  soloOptions?: SoloOptions;
  matchOptions?: MatchOptions;
  debugEnabled: boolean;
  isNavFresh: boolean;
  isLocalMode: boolean;
  isHost: boolean;
  endpoint: string | null;
  isMatchmade: boolean;
  isSolo: boolean;
  matchTargetSize: number;
  matchFillWithBots: boolean;
  soloBotCount: number;
  soloDifficulty: ReturnType<typeof parseBotDifficulty>;
};

function OnlinePlaySession(props: PlaySessionProps) {
  const connection = useGameConnection(
    props.roomId,
    props.name,
    props.sessionMode,
    props.soloOptions,
    props.debugEnabled,
    props.matchOptions,
  );
  return <PlaySessionView {...props} connection={connection} />;
}

function LocalPlaySession(props: PlaySessionProps) {
  const connection = useP2PConnection(props.roomId, props.name, {
    enabled: true,
    role: props.isHost ? "host" : "guest",
    endpoint: props.endpoint,
    sessionMode: props.sessionMode,
    soloOptions: props.soloOptions,
    debugEnabled: props.debugEnabled,
    matchOptions: props.matchOptions,
  });
  return <PlaySessionView {...props} connection={connection} />;
}

function PlaySessionView({
  roomId,
  name,
  isNavFresh,
  isLocalMode,
  endpoint,
  isMatchmade,
  isSolo,
  matchTargetSize,
  matchFillWithBots,
  soloBotCount,
  soloDifficulty,
  debugEnabled,
  connection,
}: PlaySessionProps & { connection: GameConnectionState }) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const voice = useThemeVoice();
  const { playerGridEnabled } = useUiPrefs();
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
  } = connection;

  const [showConnecting, setShowConnecting] = useState(false);

  useEffect(() => {
    if (!view || !isNavFresh) return;
    const params = new URLSearchParams({ name });
    if (isLocalMode) params.set("mode", "local");
    if (searchParams.has("host")) params.set("host", "1");
    if (searchParams.has("join")) params.set("join", "1");
    if (isLocalMode && endpoint) params.set("endpoint", endpoint);
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
    endpoint,
    isLocalMode,
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
  const seatCount =
    view?.players.filter((player) => !player.isWaiting).length ?? 0;
  const fillChin = shouldFillPlayShellChin({
    pageScrollable,
    playerGridEnabled,
    seatCount,
  });

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

export default function PlayPage({
  params,
}: {
  params: Promise<{ roomId: string }>;
}) {
  const { roomId } = use(params);
  const searchParams = useSearchParams();
  const router = useRouter();
  useRehydrateUiPrefs();
  const name = searchParams.get("name")?.trim() ?? "";
  const debugEnabled = hasDebugQueryParam(searchParams);
  const isLocalMode = searchParams.get("mode") === "local";
  const isHost = searchParams.get("host") === "1";
  const endpoint = searchParams.get("endpoint");
  const isNavFresh =
    searchParams.has("host") || searchParams.has("join") || isLocalMode;
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

  const sessionProps: PlaySessionProps = {
    roomId,
    name,
    sessionMode,
    soloOptions,
    matchOptions,
    debugEnabled,
    isNavFresh,
    isLocalMode,
    isHost,
    endpoint,
    isMatchmade,
    isSolo,
    matchTargetSize,
    matchFillWithBots,
    soloBotCount,
    soloDifficulty,
  };

  if (isLocalMode) {
    return <LocalPlaySession {...sessionProps} />;
  }

  return <OnlinePlaySession {...sessionProps} />;
}
