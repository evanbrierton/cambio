export const DEFAULT_MATCH_TARGET_SIZE = 4;
export const MIN_MATCH_TARGET_SIZE = 2;
export const MAX_MATCH_TARGET_SIZE = 6;

export const DEFAULT_MATCH_FILL_WITH_BOTS = true;

/** PartyServer room name for the singleton matchmaking DO. */
export const MATCHMAKING_ROOM_ID = "global";

/** Soft start after lobby is start-eligible (≥2 humans). */
export const MATCH_SOFT_START_MS = 45_000;

/** Abandon solo queue when bot fill is off. */
export const MATCH_ABANDON_MS = 180_000;

/**
 * How long a disconnected human stays visible (away) in a matchmade lobby
 * before their seat is freed. Short flaps must not drop seats.
 */
export const MATCH_LOBBY_AWAY_REMOVE_MS = 45_000;

/** Close a matchmade lobby after it has zero connected humans. */
export const MATCH_EMPTY_LOBBY_CLOSE_MS = 5_000;

export type MatchmakingConfig = {
  targetSize: number;
  fillWithBots: boolean;
};

export type MatchmakingClientMessage =
  | {
      type: "enqueue";
      name: string;
      playerId?: string;
      targetSize?: number;
      fillWithBots?: boolean;
    }
  | { type: "cancel" };

export type MatchmakingServerMessage =
  | {
      type: "matched";
      roomId: string;
      playerId: string;
      targetSize: number;
      fillWithBots: boolean;
    }
  | { type: "error"; message: string };

export function clampMatchTargetSize(value: number): number {
  if (!Number.isFinite(value)) return DEFAULT_MATCH_TARGET_SIZE;
  return Math.min(
    MAX_MATCH_TARGET_SIZE,
    Math.max(MIN_MATCH_TARGET_SIZE, Math.round(value)),
  );
}

export function bucketKey(config: MatchmakingConfig): string {
  return `${config.targetSize}:${config.fillWithBots ? "1" : "0"}`;
}
