import { z } from "zod";
import type { ClientMessage, ServerMessage } from "./types";

const suitSchema = z.enum(["hearts", "diamonds", "clubs", "spades", "joker"]);

const rankSchema = z.enum([
  "2",
  "3",
  "4",
  "5",
  "6",
  "7",
  "8",
  "9",
  "10",
  "J",
  "Q",
  "K",
  "A",
  "JOKER",
]);

export const cardSchema = z.object({
  id: z.string(),
  suit: suitSchema,
  rank: rankSchema,
});

const botDifficultySchema = z.enum(["easy", "medium", "hard"]);

const cardPointValuesSchema = z.object({
  ace: z.number(),
  face: z.number(),
  joker: z.number(),
  blackKing: z.number(),
  redKing: z.number(),
});

const partialCardPointValuesSchema = cardPointValuesSchema.partial();

const gamePhaseSchema = z.enum([
  "lobby",
  "setup_peek",
  "playing",
  "cambio_final",
  "snap_window",
  "revealed",
  "ended",
]);

const pendingAbilityKindSchema = z.enum([
  "peek_own",
  "spy",
  "blind_switch",
  "queen_look",
  "queen_swap",
  "king_look",
  "king_swap",
  "snap_give",
]);

const pendingAbilitySchema = z.object({
  playerId: z.string(),
  kind: pendingAbilityKindSchema,
  lookedCards: z.array(
    z.object({
      playerId: z.string(),
      slot: z.number(),
      card: cardSchema,
    }),
  ),
  maxLooks: z.number(),
  snapTargetPlayerId: z.string().optional(),
});

const publicCardSlotSchema = z.object({
  card: cardSchema.nullable(),
  faceUp: z.boolean(),
  hidden: z.boolean(),
  empty: z.boolean().optional(),
  isPenalty: z.boolean().optional(),
});

const publicPlayerSchema = z.object({
  id: z.string(),
  name: z.string(),
  hand: z.array(publicCardSlotSchema),
  penaltyCount: z.number(),
  hasCalledCambio: z.boolean(),
  finalTurnDone: z.boolean(),
  isWaiting: z.boolean(),
  connected: z.boolean(),
  isBot: z.boolean(),
  isHost: z.boolean(),
  isCurrentTurn: z.boolean(),
  isThinking: z.boolean(),
});

const scoreboardEntrySchema = z.object({
  id: z.string(),
  name: z.string(),
  score: z.number(),
});

const roundResultSchema = z.object({
  roundNumber: z.number(),
  entries: z.array(scoreboardEntrySchema),
  winnerIds: z.array(z.string()),
  cambioCallerId: z.string().nullable(),
});

const chatMessageSchema = z.object({
  id: z.string(),
  playerId: z.string(),
  playerName: z.string(),
  text: z.string(),
  sentAt: z.number(),
});

const playerViewSchema = z.object({
  roomId: z.string(),
  playerId: z.string(),
  phase: gamePhaseSchema,
  players: z.array(publicPlayerSchema),
  currentPlayerIndex: z.number(),
  deckCount: z.number(),
  discardTop: cardSchema.nullable(),
  drawnCard: cardSchema.nullable(),
  drawnFromDiscard: z.boolean(),
  hasDrawnCard: z.boolean(),
  canCallCambio: z.boolean(),
  canDraw: z.boolean(),
  canSwap: z.boolean(),
  canDiscardDrawn: z.boolean(),
  canSnap: z.boolean(),
  pendingAbility: pendingAbilitySchema.nullable(),
  snapGivePending: z.boolean(),
  debugReveal: z.boolean(),
  isWaiting: z.boolean(),
  canStartGame: z.boolean(),
  canShowResults: z.boolean(),
  roundNumber: z.number(),
  roundHistory: z.array(roundResultSchema),
  cumulativeScores: z.record(z.string(), z.number()),
  cambioCallerId: z.string().nullable(),
  winnerIds: z.array(z.string()),
  scores: z.record(z.string(), z.number()).nullable(),
  snapWindowEndsAt: z.number().nullable(),
  isSoloMode: z.boolean(),
  canAddBot: z.boolean(),
  jokerCount: z.number(),
  canSetJokerCount: z.boolean(),
  cardPoints: cardPointValuesSchema,
  canSetCardPoints: z.boolean(),
  log: z.array(z.string()),
  chatMessages: z.array(chatMessageSchema),
});

const peekFlashKindSchema = z.enum(["setup_peek", "peek_own", "spy", "look"]);

const swapFlashSlotSchema = z.object({
  playerId: z.string(),
  slot: z.number(),
});

export const clientMessageSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("join"),
    playerId: z.string().optional(),
    name: z.string(),
  }),
  z.object({ type: z.literal("start_game") }),
  z.object({ type: z.literal("setup_peek"), slot: z.number() }),
  z.object({
    type: z.literal("draw"),
    source: z.enum(["deck", "discard"]),
  }),
  z.object({ type: z.literal("swap"), slot: z.number() }),
  z.object({ type: z.literal("discard_drawn") }),
  z.object({ type: z.literal("call_cambio") }),
  z.object({
    type: z.literal("snap"),
    targetPlayerId: z.string(),
    slot: z.number(),
  }),
  z.object({ type: z.literal("snap_give"), slot: z.number() }),
  z.object({ type: z.literal("toggle_debug") }),
  z.object({ type: z.literal("restart_game") }),
  z.object({ type: z.literal("show_results") }),
  z.object({
    type: z.literal("add_bot"),
    difficulty: botDifficultySchema.optional(),
  }),
  z.object({
    type: z.literal("remove_bot"),
    playerId: z.string(),
  }),
  z.object({
    type: z.literal("set_joker_count"),
    count: z.number(),
  }),
  z.object({
    type: z.literal("set_card_points"),
    values: partialCardPointValuesSchema,
  }),
  z.object({ type: z.literal("chat"), text: z.string() }),
  z.object({
    type: z.literal("ability_look"),
    playerId: z.string(),
    slot: z.number(),
  }),
  z.object({
    type: z.literal("ability_swap"),
    fromPlayerId: z.string(),
    fromSlot: z.number(),
    toPlayerId: z.string(),
    toSlot: z.number(),
  }),
]);

export const serverMessageSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("state"), view: playerViewSchema }),
  z.object({
    type: z.literal("secret_peek"),
    playerId: z.string(),
    slot: z.number(),
    card: cardSchema,
  }),
  z.object({
    type: z.literal("peek_flash"),
    kind: peekFlashKindSchema,
    actorId: z.string(),
    playerId: z.string(),
    slot: z.number(),
  }),
  z.object({
    type: z.literal("swap_flash"),
    slots: z.array(swapFlashSlotSchema),
  }),
  z.object({
    type: z.literal("penalty_flash"),
    playerId: z.string(),
    slot: z.number(),
  }),
  z.object({
    type: z.literal("cambio_flash"),
    playerId: z.string(),
  }),
  z.object({ type: z.literal("reshuffle_flash") }),
  z.object({
    type: z.literal("discard_draw_flash"),
    playerId: z.string(),
  }),
  z.object({
    type: z.literal("deck_draw_flash"),
    playerId: z.string(),
  }),
  z.object({ type: z.literal("error"), message: z.string() }),
  z.object({
    type: z.literal("room_info"),
    roomId: z.string(),
    playerId: z.string(),
  }),
]);

export function parseClientMessage(input: unknown): ClientMessage | null {
  const result = clientMessageSchema.safeParse(input);
  return result.success ? result.data : null;
}

export function parseServerMessage(input: unknown): ServerMessage | null {
  const result = serverMessageSchema.safeParse(input);
  return result.success ? result.data : null;
}

export function parseClientMessageJson(raw: string): ClientMessage | null {
  try {
    return parseClientMessage(JSON.parse(raw));
  } catch {
    return null;
  }
}

export function parseServerMessageJson(raw: string): ServerMessage | null {
  try {
    return parseServerMessage(JSON.parse(raw));
  } catch {
    return null;
  }
}
