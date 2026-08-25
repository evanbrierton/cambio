import "partysocket/event-target-polyfill";

import {
  DEFAULT_BOT_COUNT,
  parseBotDifficulty,
} from "@cambio/game";
import {
  type SessionMode,
  useGameConnection,
} from "@cambio/client";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  ConnectingView,
  GameInProgressView,
  LobbyView,
} from "@/LobbyView";
import { colors } from "@/theme";

const CONNECTING_UI_DELAY_MS = 300;

export default function PlayScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    roomId: string;
    name?: string;
    host?: string;
    join?: string;
    solo?: string;
    bots?: string;
    difficulty?: string;
  }>();

  const roomId = params.roomId ?? "";
  const name = params.name?.trim() ?? "";
  const isNavFresh = params.host === "1" || params.join === "1";
  const sessionMode: SessionMode = isNavFresh ? "new" : "reconnect";
  const isSolo = params.solo === "1";
  const soloBotCount =
    Number.parseInt(params.bots ?? String(DEFAULT_BOT_COUNT), 10) ||
    DEFAULT_BOT_COUNT;
  const soloDifficulty = parseBotDifficulty(params.difficulty ?? null);

  const soloOptions = useMemo(
    () =>
      isSolo && isNavFresh
        ? {
            botCount: soloBotCount,
            difficulty: soloDifficulty,
          }
        : undefined,
    [isSolo, isNavFresh, soloBotCount, soloDifficulty],
  );

  const urlCleanedRef = useRef(false);

  useEffect(() => {
    if (isNavFresh && !name) {
      router.replace("/");
    }
  }, [isNavFresh, name, router]);

  const { connected, view, error, send } = useGameConnection(
    roomId,
    name,
    sessionMode,
    soloOptions,
  );

  const [showConnecting, setShowConnecting] = useState(false);

  useEffect(() => {
    if (!view || !isNavFresh || urlCleanedRef.current) return;
    urlCleanedRef.current = true;

    const nextParams: Record<string, string> = { roomId, name };
    if (params.host === "1") nextParams.host = "1";
    if (params.join === "1") nextParams.join = "1";
    if (isSolo) {
      nextParams.solo = "1";
      nextParams.bots = String(soloBotCount);
      nextParams.difficulty = soloDifficulty;
    }

    router.replace({
      pathname: "/play/[roomId]",
      params: nextParams,
    });
  }, [
    view,
    isNavFresh,
    isSolo,
    soloBotCount,
    soloDifficulty,
    name,
    roomId,
    router,
    params.host,
    params.join,
  ]);

  useEffect(() => {
    if (view || error) {
      setShowConnecting(false);
      return;
    }
    const timer = setTimeout(() => {
      setShowConnecting(true);
    }, CONNECTING_UI_DELAY_MS);
    return () => clearTimeout(timer);
  }, [view, error]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <Stack.Screen options={{ title: roomId || "Lobby" }} />
      {!view ? (
        <ConnectingView error={error} showConnecting={showConnecting} />
      ) : view.phase === "lobby" || view.isWaiting ? (
        <LobbyView
          roomId={roomId}
          view={view}
          connected={connected}
          send={send}
        />
      ) : (
        <GameInProgressView phase={view.phase} />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: colors.background,
    flex: 1,
  },
});
