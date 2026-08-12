"use client";

import { nanoid } from "nanoid";
import PartySocket from "partysocket";
import { useCallback, useEffect, useRef, useState } from "react";
import { getPartyHost } from "@/lib/party";
import type {
  MatchmakingClientMessage,
  MatchmakingServerMessage,
} from "@/matchmaking/types";

const MATCHMAKING_PLAYER_KEY = "cambio-matchmaking-player";

export type MatchmakingResult = {
  roomId: string;
  playerId: string;
  targetSize: number;
  fillWithBots: boolean;
};

export function useMatchmaking(playerName: string) {
  const [error, setError] = useState<string | null>(null);
  const [matching, setMatching] = useState(false);
  const socketRef = useRef<PartySocket | null>(null);

  const cancel = useCallback(() => {
    const socket = socketRef.current;
    if (socket) {
      if (socket.readyState === WebSocket.OPEN) {
        const message: MatchmakingClientMessage = { type: "cancel" };
        socket.send(JSON.stringify(message));
      }
      socket.close();
    }
    socketRef.current = null;
    setMatching(false);
  }, []);

  const findMatch = useCallback(
    (
      targetSize = 4,
      fillWithBots = true,
    ): Promise<MatchmakingResult | null> => {
      const trimmedName = playerName.trim();
      if (!trimmedName) {
        setError("Please enter a name.");
        return Promise.resolve(null);
      }

      cancel();
      setError(null);
      setMatching(true);

      const playerId =
        sessionStorage.getItem(MATCHMAKING_PLAYER_KEY) ?? nanoid(10);
      sessionStorage.setItem(MATCHMAKING_PLAYER_KEY, playerId);

      return new Promise((resolve) => {
        const socket = new PartySocket({
          host: getPartyHost(),
          party: "matchmaking",
          room: "global",
        });
        socketRef.current = socket;

        const finish = (result: MatchmakingResult | null, message?: string) => {
          socket.close();
          socketRef.current = null;
          setMatching(false);
          if (message) setError(message);
          resolve(result);
        };

        socket.addEventListener("open", () => {
          const message: MatchmakingClientMessage = {
            type: "enqueue",
            name: trimmedName,
            playerId,
            targetSize,
            fillWithBots,
          };
          socket.send(JSON.stringify(message));
        });

        socket.addEventListener("message", (event) => {
          let data: MatchmakingServerMessage;
          try {
            data = JSON.parse(event.data as string) as MatchmakingServerMessage;
          } catch {
            finish(null, "Invalid matchmaking response.");
            return;
          }

          if (data.type === "error") {
            finish(null, data.message);
            return;
          }

          if (data.type === "matched") {
            finish({
              roomId: data.roomId,
              playerId: data.playerId,
              targetSize: data.targetSize,
              fillWithBots: data.fillWithBots,
            });
          }
        });

        socket.addEventListener("error", () => {
          finish(null, "Could not connect to matchmaking.");
        });

        socket.addEventListener("close", () => {
          setMatching(false);
        });
      });
    },
    [cancel, playerName],
  );

  useEffect(() => cancel, [cancel]);

  return { findMatch, cancel, matching, error };
}
