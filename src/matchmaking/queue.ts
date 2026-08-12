import { customAlphabet } from "nanoid";
import {
  bucketKey,
  clampMatchTargetSize,
  DEFAULT_MATCH_FILL_WITH_BOTS,
  DEFAULT_MATCH_TARGET_SIZE,
  type MatchmakingConfig,
} from "./types";

const roomIdAlphabet = customAlphabet(
  "abcdefghijklmnopqrstuvwxyz0123456789",
  6,
);

export type OpenLobby = {
  roomId: string;
  assignedCount: number;
  targetSize: number;
  fillWithBots: boolean;
  createdAt: number;
};

export type MatchAssignment = {
  roomId: string;
  targetSize: number;
  fillWithBots: boolean;
};

export type MatchmakingQueueState = {
  buckets: Record<string, OpenLobby[]>;
  /** playerId → lobby roomId for cancel on disconnect */
  assignments: Record<string, string>;
};

export function createMatchmakingQueueState(): MatchmakingQueueState {
  return { buckets: {}, assignments: {} };
}

export function normalizeMatchConfig(
  targetSize?: number,
  fillWithBots?: boolean,
): MatchmakingConfig {
  return {
    targetSize: clampMatchTargetSize(targetSize ?? DEFAULT_MATCH_TARGET_SIZE),
    fillWithBots: fillWithBots ?? DEFAULT_MATCH_FILL_WITH_BOTS,
  };
}

function sortedLobbies(lobbies: OpenLobby[]): OpenLobby[] {
  return [...lobbies].sort((a, b) => a.createdAt - b.createdAt);
}

export function assignPlayer(
  state: MatchmakingQueueState,
  playerId: string,
  config: MatchmakingConfig,
  now = Date.now(),
): MatchAssignment {
  const existingRoomId = state.assignments[playerId];
  if (existingRoomId) {
    for (const lobbies of Object.values(state.buckets)) {
      const existing = lobbies.find((lobby) => lobby.roomId === existingRoomId);
      if (existing) {
        return {
          roomId: existing.roomId,
          targetSize: existing.targetSize,
          fillWithBots: existing.fillWithBots,
        };
      }
    }
    delete state.assignments[playerId];
  }

  const key = bucketKey(config);
  const lobbies = state.buckets[key] ?? [];
  const open = sortedLobbies(lobbies).find(
    (lobby) => lobby.assignedCount < lobby.targetSize,
  );

  if (open) {
    open.assignedCount += 1;
    state.assignments[playerId] = open.roomId;
    return {
      roomId: open.roomId,
      targetSize: open.targetSize,
      fillWithBots: open.fillWithBots,
    };
  }

  const roomId = roomIdAlphabet();
  const lobby: OpenLobby = {
    roomId,
    assignedCount: 1,
    targetSize: config.targetSize,
    fillWithBots: config.fillWithBots,
    createdAt: now,
  };
  state.buckets[key] = [...lobbies, lobby];
  state.assignments[playerId] = roomId;
  return {
    roomId,
    targetSize: config.targetSize,
    fillWithBots: config.fillWithBots,
  };
}

export function cancelAssignment(
  state: MatchmakingQueueState,
  playerId: string,
): boolean {
  const roomId = state.assignments[playerId];
  if (!roomId) return false;
  delete state.assignments[playerId];

  for (const lobbies of Object.values(state.buckets)) {
    const lobby = lobbies.find((entry) => entry.roomId === roomId);
    if (!lobby) continue;
    lobby.assignedCount = Math.max(0, lobby.assignedCount - 1);
    return true;
  }
  return true;
}
