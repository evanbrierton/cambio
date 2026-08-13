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
  /** Player ids that left this lobby and must not be reseated here. */
  excludedPlayerIds: string[];
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

function lobbyExcludesPlayer(lobby: OpenLobby, playerId: string): boolean {
  return lobby.excludedPlayerIds?.includes(playerId) ?? false;
}

function findLobby(
  state: MatchmakingQueueState,
  roomId: string,
): OpenLobby | undefined {
  for (const lobbies of Object.values(state.buckets)) {
    const lobby = lobbies.find((entry) => entry.roomId === roomId);
    if (lobby) return lobby;
  }
  return undefined;
}

export function normalizeQueueState(
  saved: MatchmakingQueueState,
): MatchmakingQueueState {
  const buckets: Record<string, OpenLobby[]> = {};
  for (const [key, lobbies] of Object.entries(saved.buckets ?? {})) {
    buckets[key] = (lobbies ?? []).map((lobby) => ({
      ...lobby,
      excludedPlayerIds: lobby.excludedPlayerIds ?? [],
    }));
  }
  return {
    buckets,
    assignments: saved.assignments ?? {},
  };
}

export function assignPlayer(
  state: MatchmakingQueueState,
  playerId: string,
  config: MatchmakingConfig,
  now = Date.now(),
): MatchAssignment {
  const existingRoomId = state.assignments[playerId];
  if (existingRoomId) {
    const existing = findLobby(state, existingRoomId);
    if (existing && !lobbyExcludesPlayer(existing, playerId)) {
      return {
        roomId: existing.roomId,
        targetSize: existing.targetSize,
        fillWithBots: existing.fillWithBots,
      };
    }
    delete state.assignments[playerId];
  }

  const key = bucketKey(config);
  const lobbies = state.buckets[key] ?? [];
  const open = sortedLobbies(lobbies).find(
    (lobby) =>
      lobby.assignedCount < lobby.targetSize &&
      !lobbyExcludesPlayer(lobby, playerId),
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
    excludedPlayerIds: [],
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

/**
 * A player left a game lobby. Free their seat and never reseat them there.
 * Empty lobbies are closed so new searchers are not dropped onto a dying room.
 */
export function leaveLobby(
  state: MatchmakingQueueState,
  roomId: string,
  playerId: string,
): boolean {
  const assignedRoomId = state.assignments[playerId];
  if (assignedRoomId === roomId) {
    delete state.assignments[playerId];
  }

  const lobby = findLobby(state, roomId);
  if (!lobby) return assignedRoomId === roomId;

  lobby.excludedPlayerIds ??= [];
  if (!lobby.excludedPlayerIds.includes(playerId)) {
    lobby.excludedPlayerIds.push(playerId);
  }

  if (assignedRoomId === roomId) {
    lobby.assignedCount = Math.max(0, lobby.assignedCount - 1);
  }

  if (lobby.assignedCount <= 0) {
    closeLobby(state, roomId);
  }

  return true;
}

/** Remove a lobby from the open queue once its game has started (or is dead). */
export function closeLobby(
  state: MatchmakingQueueState,
  roomId: string,
): boolean {
  let closed = false;
  for (const [key, lobbies] of Object.entries(state.buckets)) {
    const next = lobbies.filter((lobby) => lobby.roomId !== roomId);
    if (next.length !== lobbies.length) {
      state.buckets[key] = next;
      closed = true;
    }
  }
  for (const [playerId, assignedRoomId] of Object.entries(state.assignments)) {
    if (assignedRoomId === roomId) {
      delete state.assignments[playerId];
      closed = true;
    }
  }
  return closed;
}
