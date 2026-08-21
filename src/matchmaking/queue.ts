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
  /** Humans assigned via matchmaking (and synced from the game room). */
  assignedCount: number;
  /** Bots already seated in the game lobby. */
  botCount: number;
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

export function lobbyFilledSeats(lobby: OpenLobby): number {
  return lobby.assignedCount + lobby.botCount;
}

export function lobbyHasFreeSeat(lobby: OpenLobby): boolean {
  return lobbyFilledSeats(lobby) < lobby.targetSize;
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
  const open = sortedLobbies(lobbies).find((lobby) => lobbyHasFreeSeat(lobby));

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
    botCount: 0,
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

export type ListLobbyParams = {
  roomId: string;
  targetSize: number;
  fillWithBots: boolean;
  humanCount: number;
  botCount: number;
  createdAt?: number;
};

/**
 * List or refresh a public lobby created from a game room (visibility flip).
 * Seat counts come from the authoritative game lobby.
 */
export function listLobby(
  state: MatchmakingQueueState,
  params: ListLobbyParams,
): OpenLobby {
  const config = normalizeMatchConfig(params.targetSize, params.fillWithBots);
  const key = bucketKey(config);
  const humanCount = Math.max(0, Math.round(params.humanCount));
  const botCount = Math.max(0, Math.round(params.botCount));

  // Drop from other buckets if config changed.
  for (const [bucket, lobbies] of Object.entries(state.buckets)) {
    if (bucket === key) continue;
    state.buckets[bucket] = lobbies.filter(
      (lobby) => lobby.roomId !== params.roomId,
    );
  }

  const lobbies = state.buckets[key] ?? [];
  const existing = lobbies.find((lobby) => lobby.roomId === params.roomId);
  if (existing) {
    existing.assignedCount = humanCount;
    existing.botCount = botCount;
    existing.targetSize = config.targetSize;
    existing.fillWithBots = config.fillWithBots;
    return existing;
  }

  const lobby: OpenLobby = {
    roomId: params.roomId,
    assignedCount: humanCount,
    botCount,
    targetSize: config.targetSize,
    fillWithBots: config.fillWithBots,
    createdAt: params.createdAt ?? Date.now(),
  };
  state.buckets[key] = [...lobbies, lobby];
  return lobby;
}

/** Sync seat counts for an already-listed public lobby. */
export function updateLobbySeats(
  state: MatchmakingQueueState,
  roomId: string,
  humanCount: number,
  botCount: number,
): OpenLobby | null {
  for (const lobbies of Object.values(state.buckets)) {
    const lobby = lobbies.find((entry) => entry.roomId === roomId);
    if (!lobby) continue;
    lobby.assignedCount = Math.max(0, Math.round(humanCount));
    lobby.botCount = Math.max(0, Math.round(botCount));
    return lobby;
  }
  return null;
}
