export type Suit = "hearts" | "diamonds" | "clubs" | "spades" | "joker";

export type Rank =
  | "2"
  | "3"
  | "4"
  | "5"
  | "6"
  | "7"
  | "8"
  | "9"
  | "10"
  | "J"
  | "Q"
  | "K"
  | "A"
  | "JOKER";

export type Card = {
  id: string;
  suit: Suit;
  rank: Rank;
};

export type CardSlot = {
  card: Card | null;
  faceUp: boolean;
  isPenalty?: boolean;
};

export type GamePhase =
  | "lobby"
  | "setup_peek"
  | "playing"
  | "cambio_final"
  | "snap_window"
  | "revealed"
  | "ended";

/** Bottom row indices in the 2×2 hand grid. */
export const SETUP_PEEK_SLOTS: number[] = [2, 3];

export type PendingAbilityKind =
  | "peek_own"
  | "spy"
  | "blind_switch"
  | "queen_look"
  | "queen_swap"
  | "king_look"
  | "king_swap"
  | "snap_give";

export type PendingAbility = {
  playerId: string;
  kind: PendingAbilityKind;
  lookedCards: Array<{ playerId: string; slot: number; card: Card }>;
  maxLooks: number;
  /** Opponent who lost a card to a correct snap — snapper must give them one card. */
  snapTargetPlayerId?: string;
};

export type BotDifficulty = "easy" | "medium" | "hard";

export function parseBotDifficulty(value: string | null): BotDifficulty {
  if (value === "hard") return "hard";
  if (value === "medium") return "medium";
  return "easy";
}

export const DEFAULT_BOT_COUNT = 2;
export const MIN_BOT_COUNT = 1;
export const MAX_BOT_COUNT = 5;

export const DEFAULT_JOKER_COUNT = 2;
export const MIN_JOKER_COUNT = 2;
export const MAX_JOKER_COUNT = 4;

export type ChatMessage = {
  id: string;
  playerId: string;
  playerName: string;
  text: string;
  sentAt: number;
};

export type ScoreboardEntry = {
  id: string;
  name: string;
  score: number;
};

export type RoundResult = {
  roundNumber: number;
  entries: ScoreboardEntry[];
  winnerIds: string[];
  cambioCallerId: string | null;
};

export type PlayerState = {
  id: string;
  name: string;
  hand: CardSlot[];
  penaltyCount: number;
  setupPeekedSlots: number[];
  hasCalledCambio: boolean;
  finalTurnDone: boolean;
  isWaiting: boolean;
  connected: boolean;
  isBot: boolean;
  botDifficulty: BotDifficulty | null;
};

export type GameState = {
  roomId: string;
  phase: GamePhase;
  isSoloMode: boolean;
  soloDifficulty: BotDifficulty | null;
  jokerCount: number;
  hostId: string;
  players: PlayerState[];
  currentPlayerIndex: number;
  deck: Card[];
  discard: Card[];
  cambioCallerId: string | null;
  pendingAbility: PendingAbility | null;
  drawnCard: Card | null;
  drawnFromDiscard: boolean;
  turnStarted: boolean;
  debugReveal: boolean;
  roundNumber: number;
  roundHistory: RoundResult[];
  cumulativeScores: Record<string, number>;
  winnerIds: string[];
  scores: Record<string, number> | null;
  snapWindowEndsAt: number | null;
  /** ID of the discard-top card placed by draw/swap discard; cleared after a snap. */
  snapEligibleTopCardId: string | null;
  /** During play, only this player may snap again after a correct snap. */
  snapChainPlayerId: string | null;
  botThinkingId: string | null;
  log: string[];
  chatMessages: ChatMessage[];
};

export type SwapFlashSlot = {
  playerId: string;
  slot: number;
};

export type PeekFlashKind = "setup_peek" | "peek_own" | "spy" | "look";

export type PeekFlash = {
  kind: PeekFlashKind;
  actorId: string;
  playerId: string;
  slot: number;
};

export const HAND_BASE_SLOTS = 4;

export type PenaltyFlash = {
  playerId: string;
  slot: number;
};

export type ClientMessage =
  | { type: "join"; playerId?: string; name: string }
  | { type: "start_game" }
  | { type: "setup_peek"; slot: number }
  | { type: "draw"; source: "deck" | "discard" }
  | { type: "swap"; slot: number }
  | { type: "discard_drawn" }
  | { type: "call_cambio" }
  | { type: "snap"; targetPlayerId: string; slot: number }
  | { type: "snap_give"; slot: number }
  | { type: "toggle_debug" }
  | { type: "restart_game" }
  | { type: "show_results" }
  | { type: "add_bot"; difficulty?: BotDifficulty }
  | { type: "remove_bot"; playerId: string }
  | { type: "set_joker_count"; count: number }
  | { type: "chat"; text: string }
  | { type: "ability_look"; playerId: string; slot: number }
  | {
      type: "ability_swap";
      fromPlayerId: string;
      fromSlot: number;
      toPlayerId: string;
      toSlot: number;
    };

export type PublicCardSlot = {
  card: Card | null;
  faceUp: boolean;
  hidden: boolean;
  empty?: boolean;
  isPenalty?: boolean;
};

export type PublicPlayer = {
  id: string;
  name: string;
  hand: PublicCardSlot[];
  penaltyCount: number;
  hasCalledCambio: boolean;
  finalTurnDone: boolean;
  isWaiting: boolean;
  connected: boolean;
  isBot: boolean;
  isHost: boolean;
  isCurrentTurn: boolean;
  isThinking: boolean;
};

export type PlayerView = {
  roomId: string;
  playerId: string;
  phase: GamePhase;
  players: PublicPlayer[];
  currentPlayerIndex: number;
  deckCount: number;
  discardTop: Card | null;
  drawnCard: Card | null;
  drawnFromDiscard: boolean;
  hasDrawnCard: boolean;
  canCallCambio: boolean;
  canDraw: boolean;
  canSwap: boolean;
  canDiscardDrawn: boolean;
  canSnap: boolean;
  pendingAbility: PendingAbility | null;
  debugReveal: boolean;
  isWaiting: boolean;
  canStartGame: boolean;
  canShowResults: boolean;
  roundNumber: number;
  roundHistory: RoundResult[];
  cumulativeScores: Record<string, number>;
  cambioCallerId: string | null;
  winnerIds: string[];
  scores: Record<string, number> | null;
  snapWindowEndsAt: number | null;
  isSoloMode: boolean;
  canAddBot: boolean;
  jokerCount: number;
  canSetJokerCount: boolean;
  log: string[];
  chatMessages: ChatMessage[];
};

export type ServerMessage =
  | { type: "state"; view: PlayerView }
  | { type: "secret_peek"; playerId: string; slot: number; card: Card }
  | {
      type: "peek_flash";
      kind: PeekFlashKind;
      actorId: string;
      playerId: string;
      slot: number;
    }
  | { type: "swap_flash"; slots: SwapFlashSlot[] }
  | { type: "penalty_flash"; playerId: string; slot: number }
  | { type: "cambio_flash"; playerId: string }
  | { type: "error"; message: string }
  | { type: "room_info"; roomId: string; playerId: string };
