import { nanoid } from "nanoid";
import {
  abilityForDiscard,
  cardsSnapMatch,
  createDeck,
  deckSize,
  type DiscardAbility,
  shuffle,
} from "./cards";
import { computeScores, determineWinners } from "./scoring";
import type {
  BotDifficulty,
  Card,
  CardSlot,
  ChatMessage,
  ClientMessage,
  GameState,
  PeekFlash,
  PeekFlashKind,
  PlayerState,
  PlayerView,
  RoundResult,
  ScoreboardEntry,
  SwapFlashSlot,
} from "./types";
import { generateBotName, nameKey } from "./bot-names";
import {
  DEFAULT_JOKER_COUNT,
  HAND_BASE_SLOTS,
  MAX_JOKER_COUNT,
  MIN_JOKER_COUNT,
  SETUP_PEEK_SLOTS,
} from "./types";

const MAX_PLAYERS = 6;
const MIN_PLAYERS = 2;
const SETUP_PEEKS = 2;
export const SNAP_WINDOW_MS = 6_000;
const SNAP_WINDOW_GRACE_MS = 3_000;
const MAX_CHAT_MESSAGES = 100;
const MAX_CHAT_LENGTH = 200;
const CHAT_COOLDOWN_MS = 500;

export function isParticipant(player: PlayerState): boolean {
  return !player.isWaiting && (player.connected || player.isBot);
}

type LegacyRoundResult = {
  roundNumber: number;
  scores?: Record<string, number>;
  playerNames?: Record<string, string>;
  entries?: ScoreboardEntry[];
  winnerIds: string[];
  cambioCallerId: string | null;
};

export function migrateRoundHistory(
  rounds: LegacyRoundResult[] | undefined,
): RoundResult[] {
  if (!rounds) return [];

  return rounds.map((round) => {
    if (round.entries !== undefined) {
      return {
        roundNumber: round.roundNumber,
        entries: round.entries,
        winnerIds: round.winnerIds ?? [],
        cambioCallerId: round.cambioCallerId ?? null,
      };
    }

    const entries: ScoreboardEntry[] = Object.entries(round.scores ?? {}).flatMap(
      ([id, score]) => {
        const name = round.playerNames?.[id];
        return name !== undefined ? [{ id, name, score }] : [];
      },
    );

    return {
      roundNumber: round.roundNumber,
      entries,
      winnerIds: round.winnerIds,
      cambioCallerId: round.cambioCallerId,
    };
  });
}

export function addBotPlayer(
  state: GameState,
  difficulty: BotDifficulty,
): string {
  const id = nanoid(10);
  const reserved = state.players.map((p) => p.name);
  let name = generateBotName(reserved);

  for (let attempt = 0; attempt < 100 && isNameTaken(state, name); attempt++) {
    reserved.push(name);
    name = generateBotName(reserved);
  }

  state.players.push({
    id,
    name,
    hand: [],
    penaltyCount: 0,
    setupPeekedSlots: [],
    hasCalledCambio: false,
    finalTurnDone: false,
    isWaiting: false,
    connected: true,
    isBot: true,
    botDifficulty: difficulty,
  });
  state.cumulativeScores[id] = state.cumulativeScores[id] ?? 0;
  addLog(state, `${name} joined as a bot.`);
  return id;
}

export function createRoom(
  roomId: string,
  hostName: string,
  hostId?: string,
): GameState {
  const id = hostId ?? nanoid(10);
  return {
    roomId,
    phase: "lobby",
    isSoloMode: false,
    soloDifficulty: null,
    jokerCount: DEFAULT_JOKER_COUNT,
    hostId: id,
    players: [
      {
        id,
        name: hostName,
        hand: [],
        penaltyCount: 0,
        setupPeekedSlots: [],
        hasCalledCambio: false,
        finalTurnDone: false,
        isWaiting: false,
        connected: true,
        isBot: false,
        botDifficulty: null,
      },
    ],
    currentPlayerIndex: 0,
    deck: [],
    discard: [],
    cambioCallerId: null,
    pendingAbility: null,
    drawnCard: null,
    drawnFromDiscard: false,
    turnStarted: false,
    debugReveal: false,
    roundNumber: 0,
    roundHistory: [],
    cumulativeScores: { [id]: 0 },
    winnerIds: [],
    scores: null,
    snapWindowEndsAt: null,
    snapEligibleTopCardId: null,
    snapChainPlayerId: null,
    botThinkingId: null,
    log: [`${hostName} created the room.`],
    chatMessages: [],
  };
}

export function addLog(state: GameState, message: string): void {
  state.log = [...state.log.slice(-30), message];
}

export function addChatMessage(
  state: GameState,
  playerId: string,
  text: string,
  options?: { fromBot?: boolean },
): ChatMessage | { error: string } {
  const player = findPlayer(state, playerId);
  if (!player) return { error: "Player not found." };

  const trimmed = text.trim();
  if (!trimmed) return { error: "Message cannot be empty." };
  if (trimmed.length > MAX_CHAT_LENGTH) {
    return { error: `Message too long (max ${MAX_CHAT_LENGTH} characters).` };
  }

  if (!options?.fromBot) {
    const lastMessage = [...state.chatMessages]
      .reverse()
      .find((message) => message.playerId === playerId);
    if (lastMessage && Date.now() - lastMessage.sentAt < CHAT_COOLDOWN_MS) {
      return { error: "Slow down — wait a moment before sending again." };
    }
  }

  const chatMessage: ChatMessage = {
    id: nanoid(10),
    playerId,
    playerName: player.name,
    text: trimmed,
    sentAt: Date.now(),
  };
  state.chatMessages = [
    ...state.chatMessages.slice(-(MAX_CHAT_MESSAGES - 1)),
    chatMessage,
  ];
  return chatMessage;
}

function currentPlayer(state: GameState): PlayerState | undefined {
  return state.players[state.currentPlayerIndex];
}

function normalizePlayerName(name: string): string {
  return name.trim().slice(0, 24);
}

function isNameTaken(
  state: GameState,
  name: string,
  excludePlayerId?: string,
): boolean {
  const normalized = nameKey(name);
  return state.players.some(
    (p) => p.id !== excludePlayerId && nameKey(p.name) === normalized,
  );
}

export function findPlayer(
  state: GameState,
  id: string,
): PlayerState | undefined {
  return state.players.find((p) => p.id === id);
}

function isGameInProgress(state: GameState): boolean {
  return state.phase !== "lobby" && state.phase !== "ended";
}

function isPlayingPlayer(player: PlayerState): boolean {
  return !player.isWaiting && player.hand.length > 0;
}

function firstActivePlayerIndex(state: GameState): number {
  return state.players.findIndex(isPlayingPlayer);
}

function rotatePlayerOrder(state: GameState): void {
  if (state.players.length <= 1) return;
  const [first, ...rest] = state.players;
  state.players = [...rest, first];
}

function nextActivePlayerIndex(state: GameState, fromIndex: number): number {
  const n = state.players.length;
  for (let i = 1; i <= n; i++) {
    const idx = (fromIndex + i) % n;
    if (isPlayingPlayer(state.players[idx])) return idx;
  }
  return fromIndex;
}

function nextPlayerIndex(state: GameState): number {
  return nextActivePlayerIndex(state, state.currentPlayerIndex);
}

function advanceTurn(state: GameState): void {
  state.drawnCard = null;
  state.drawnFromDiscard = false;
  state.turnStarted = false;

  if (state.phase === "cambio_final") {
    const allDone = state.players
      .filter((p) => p.id !== state.cambioCallerId)
      .every((p) => p.finalTurnDone);
    if (allDone) {
      endRound(state);
      return;
    }
    let idx = nextActivePlayerIndex(state, state.currentPlayerIndex);
    let guard = 0;
    while (guard < state.players.length) {
      const p = state.players[idx];
      if (
        p.id !== state.cambioCallerId &&
        !p.finalTurnDone &&
        isPlayingPlayer(p)
      ) {
        state.currentPlayerIndex = idx;
        return;
      }
      idx = nextActivePlayerIndex(state, idx);
      guard += 1;
    }
    endRound(state);
    return;
  }

  state.currentPlayerIndex = nextPlayerIndex(state);
}

function passTurn(state: GameState, actingPlayerId: string): void {
  if (
    state.phase === "cambio_final" &&
    actingPlayerId !== state.cambioCallerId
  ) {
    const acting = findPlayer(state, actingPlayerId);
    if (acting) acting.finalTurnDone = true;
  }

  const actor = findPlayer(state, actingPlayerId);
  if (actor) addLog(state, `${actor.name} ended their turn.`);

  advanceTurn(state);

  const next = currentPlayer(state);
  if (next && state.phase !== "ended") {
    addLog(state, `${next.name}'s turn.`);
  }
}

/** After draw + swap/discard (+ abilities), pass to the next player. */
function tryPassTurnAfterAction(
  state: GameState,
  actingPlayerId: string,
): void {
  if (state.phase !== "playing" && state.phase !== "cambio_final") return;
  if (state.drawnCard || state.pendingAbility) return;
  passTurn(state, actingPlayerId);
}

function canAttemptSnap(state: GameState): boolean {
  if (state.discard.length === 0) return false;
  return isSnapEligible(state) || state.phase === "snap_window";
}

function canPlayerSnap(state: GameState): boolean {
  return canAttemptSnap(state);
}

function revealAllHands(state: GameState): void {
  for (const player of state.players) {
    for (const slot of player.hand) {
      slot.faceUp = true;
    }
  }
}

function enterRevealedPhase(state: GameState): void {
  revealAllHands(state);
  state.phase = "revealed";
  state.snapWindowEndsAt = null;
  state.snapChainPlayerId = null;
  addLog(state, "All cards revealed — waiting for host to show results.");
}

/** Another player is mid-snap (giving a card back) — block all other snaps. */
function isSnapResolutionPending(state: GameState): boolean {
  return state.pendingAbility?.kind === "snap_give";
}

/** Snapping is only allowed against an unsnapped card currently on top of discard. */
function isSnapEligible(state: GameState): boolean {
  if (state.discard.length === 0 || !state.snapEligibleTopCardId) return false;
  const top = state.discard[state.discard.length - 1];
  return top.id === state.snapEligibleTopCardId;
}

function markDiscardTopSnapEligible(state: GameState, card: Card): void {
  state.snapEligibleTopCardId = card.id;
  state.snapChainPlayerId = null;
}

function clearSnapEligibleDiscard(state: GameState): void {
  state.snapEligibleTopCardId = null;
  state.snapChainPlayerId = null;
}

export function finalizeRound(state: GameState): void {
  state.phase = "ended";
  state.snapWindowEndsAt = null;
  clearSnapEligibleDiscard(state);
  state.scores = computeScores(state);
  state.winnerIds = determineWinners(state);

  const entries: ScoreboardEntry[] = [];
  for (const player of state.players) {
    if (player.hand.length > 0) {
      entries.push({
        id: player.id,
        name: player.name,
        score: state.scores[player.id] ?? 0,
      });
    }
  }

  state.roundHistory.push({
    roundNumber: state.roundNumber,
    entries,
    winnerIds: [...state.winnerIds],
    cambioCallerId: state.cambioCallerId,
  });

  for (const entry of entries) {
    state.cumulativeScores[entry.id] =
      (state.cumulativeScores[entry.id] ?? 0) + entry.score;
  }

  for (const player of state.players) {
    if (player.isWaiting) {
      player.isWaiting = false;
      state.cumulativeScores[player.id] =
        state.cumulativeScores[player.id] ?? 0;
      addLog(state, `${player.name} is ready for the next game.`);
    }
  }

  state.pendingAbility = null;
  state.drawnCard = null;
  addLog(state, "Round over! Cards revealed.");
}

export function expireSnapWindow(state: GameState, now = Date.now()): boolean {
  if (state.phase !== "snap_window") return false;
  if (state.snapWindowEndsAt === null || now < state.snapWindowEndsAt)
    return false;
  if (state.pendingAbility) {
    state.snapWindowEndsAt = now + SNAP_WINDOW_GRACE_MS;
    return false;
  }
  enterRevealedPhase(state);
  return true;
}

function endRound(state: GameState): void {
  state.pendingAbility = null;
  state.drawnCard = null;

  if (state.discard.length > 0) {
    state.phase = "snap_window";
    state.snapChainPlayerId = null;
    state.snapWindowEndsAt = Date.now() + SNAP_WINDOW_MS;
    addLog(state, "Last chance to snap! Cards reveal when time runs out.");
    return;
  }

  enterRevealedPhase(state);
}

function dealHands(state: GameState): void {
  const deck = createDeck(state.jokerCount);
  const playing = state.players.filter((p) => !p.isWaiting);
  for (const player of playing) {
    const cards = deck.splice(0, 4);
    player.hand = cards.map((card) => ({ card, faceUp: false }));
    player.setupPeekedSlots = [];
    player.hasCalledCambio = false;
    player.finalTurnDone = false;
    player.penaltyCount = 0;
  }
  for (const player of state.players) {
    if (player.isWaiting) {
      player.hand = [];
      player.setupPeekedSlots = [];
      player.hasCalledCambio = false;
      player.finalTurnDone = false;
      player.penaltyCount = 0;
    }
  }
  state.deck = deck;
  state.discard = [];
  state.phase = "setup_peek";
  state.currentPlayerIndex = firstActivePlayerIndex(state);
  state.cambioCallerId = null;
  state.pendingAbility = null;
  state.drawnCard = null;
  state.snapWindowEndsAt = null;
  clearSnapEligibleDiscard(state);
  state.turnStarted = false;
  state.winnerIds = [];
  state.scores = null;
  addLog(state, "Cards dealt. Peek at 2 of your cards.");
}

function isProtected(playerId: string, state: GameState): boolean {
  return state.cambioCallerId === playerId && state.phase === "cambio_final";
}

function canTargetPlayer(playerId: string, state: GameState): boolean {
  return !isProtected(playerId, state);
}

function addPenalty(state: GameState, playerId: string): number | null {
  const player = findPlayer(state, playerId);
  if (!player) return null;

  if (state.deck.length === 0) {
    if (state.discard.length <= 1) return null;
    const top = state.discard.pop();
    if (!top) return null;
    state.deck = shuffle([...state.discard, top]);
    state.discard = [];
  }

  const card = state.deck.pop();
  if (!card) return null;

  const slot = placeCardInHand(player.hand, card, { isPenalty: true });
  player.penaltyCount += 1;
  addLog(state, `${player.name} received a penalty card.`);
  return slot;
}

function triggerAbility(
  state: GameState,
  playerId: string,
  ability: DiscardAbility,
): void {
  if (ability === "peek_own") {
    state.pendingAbility = {
      playerId,
      kind: "peek_own",
      lookedCards: [],
      maxLooks: 1,
    };
    addLog(state, "Peek ability — choose one of your cards.");
    return;
  }
  if (ability === "spy") {
    state.pendingAbility = {
      playerId,
      kind: "spy",
      lookedCards: [],
      maxLooks: 1,
    };
    addLog(state, "Spy ability — peek an opponent's card.");
    return;
  }
  if (ability === "blind_switch") {
    state.pendingAbility = {
      playerId,
      kind: "blind_switch",
      lookedCards: [],
      maxLooks: 0,
    };
    addLog(state, "Blind switch — pick two cards to swap.");
    return;
  }
  if (ability === "queen_look") {
    state.pendingAbility = {
      playerId,
      kind: "queen_look",
      lookedCards: [],
      maxLooks: 1,
    };
    addLog(state, "Queen — look at any card, then swap.");
    return;
  }
  if (ability === "king_look") {
    state.pendingAbility = {
      playerId,
      kind: "king_look",
      lookedCards: [],
      maxLooks: 2,
    };
    addLog(state, "King — look at 2 cards, then swap.");
    return;
  }
}

function completeAbilityIfDone(state: GameState): void {
  const pending = state.pendingAbility;
  if (!pending) return;

  if (pending.kind === "queen_look" && pending.lookedCards.length >= 1) {
    state.pendingAbility = {
      playerId: pending.playerId,
      kind: "queen_swap",
      lookedCards: pending.lookedCards,
      maxLooks: 0,
    };
    addLog(state, "Now pick two cards anywhere to swap.");
  }

  if (pending.kind === "king_look" && pending.lookedCards.length >= 2) {
    state.pendingAbility = {
      playerId: pending.playerId,
      kind: "king_swap",
      lookedCards: pending.lookedCards,
      maxLooks: 0,
    };
    addLog(state, "Now pick two cards anywhere to swap.");
  }
}

function firstEmptySlot(hand: CardSlot[]): number {
  return hand.findIndex((slot) => slot.card === null);
}

/** First open slot in the original 2×2 hand grid (including gaps after snaps). */
function firstEmptyBaseSlot(hand: CardSlot[]): number {
  for (let i = 0; i < HAND_BASE_SLOTS; i++) {
    if (i >= hand.length || hand[i].card === null) {
      return i;
    }
  }
  return -1;
}

function placeCardInHand(
  hand: CardSlot[],
  card: Card,
  options: { isPenalty?: boolean } = {},
): number {
  const entry: CardSlot = {
    card,
    faceUp: false,
    isPenalty: options.isPenalty,
  };

  const emptyIndex = options.isPenalty
    ? firstEmptyBaseSlot(hand)
    : firstEmptySlot(hand);
  if (emptyIndex !== -1) {
    if (emptyIndex === hand.length) {
      hand.push(entry);
    } else {
      hand[emptyIndex] = entry;
    }
    return emptyIndex;
  }
  hand.push(entry);
  return hand.length - 1;
}

function trimTrailingEmptySlots(hand: CardSlot[]): void {
  while (hand.length > 0 && hand[hand.length - 1].card === null) {
    hand.pop();
  }
}

function clearHandSlot(hand: CardSlot[], slot: number): void {
  hand[slot] = { card: null, faceUp: false };
  trimTrailingEmptySlots(hand);
}

function isValidHandSlot(player: PlayerState, slot: number): boolean {
  return slot >= 0 && slot < player.hand.length;
}

function slotHasCard(player: PlayerState, slot: number): boolean {
  return isValidHandSlot(player, slot) && player.hand[slot].card !== null;
}

function getHandCard(player: PlayerState, slot: number): Card | null {
  if (!slotHasCard(player, slot)) return null;
  return player.hand[slot].card;
}

function swapSlots(
  state: GameState,
  playerAId: string,
  slotA: number,
  playerBId: string,
  slotB: number,
): boolean {
  const a = findPlayer(state, playerAId);
  const b = findPlayer(state, playerBId);
  if (!a || !b) return false;
  if (!isValidHandSlot(a, slotA) || !isValidHandSlot(b, slotB)) return false;
  if (playerAId !== playerBId) {
    if (
      !canTargetPlayer(playerAId, state) ||
      !canTargetPlayer(playerBId, state)
    ) {
      return false;
    }
  }

  const temp = a.hand[slotA];
  a.hand[slotA] = b.hand[slotB];
  b.hand[slotB] = temp;
  return true;
}

export function handleMessage(
  state: GameState,
  playerId: string,
  message: ClientMessage,
): {
  error?: string;
  secretPeek?: { playerId: string; slot: number; card: unknown };
  peekFlash?: PeekFlash;
  swapFlash?: { slots: SwapFlashSlot[] };
  penaltyFlash?: { playerId: string; slot: number };
  cambioFlash?: { playerId: string };
} {
  switch (message.type) {
    case "join": {
      const trimmedName = normalizePlayerName(message.name);
      const existing = findPlayer(state, playerId);
      if (existing) {
        existing.connected = true;
        if (trimmedName) {
          if (isNameTaken(state, trimmedName, playerId)) {
            return { error: "That name is already taken." };
          }
          existing.name = trimmedName;
        }
        return {};
      }
      if (!trimmedName) {
        return { error: "Please enter a name." };
      }
      if (isNameTaken(state, trimmedName)) {
        return { error: "That name is already taken." };
      }
      if (state.players.length >= MAX_PLAYERS) {
        return { error: "Room is full." };
      }
      const waiting = isGameInProgress(state);
      state.players.push({
        id: playerId,
        name: trimmedName,
        hand: [],
        penaltyCount: 0,
        setupPeekedSlots: [],
        hasCalledCambio: false,
        finalTurnDone: false,
        isWaiting: waiting,
        connected: true,
        isBot: false,
        botDifficulty: null,
      });
      state.cumulativeScores[playerId] = state.cumulativeScores[playerId] ?? 0;
      if (waiting) {
        addLog(
          state,
          `${trimmedName} joined — waiting for the current game to end.`,
        );
      } else {
        addLog(state, `${trimmedName} joined.`);
      }
      return {};
    }

    case "start_game": {
      if (playerId !== state.hostId)
        return { error: "Only the host can start." };
      if (state.phase !== "lobby" && state.phase !== "ended") {
        return { error: "A game is already in progress." };
      }
      const participants = state.players.filter(isParticipant);
      if (participants.length < MIN_PLAYERS) {
        return { error: `Need at least ${MIN_PLAYERS} players.` };
      }
      if (state.roundNumber >= 1) {
        rotatePlayerOrder(state);
        addLog(state, "Player order rotated.");
      }
      state.roundNumber += 1;
      dealHands(state);
      return {};
    }

    case "setup_peek": {
      if (state.phase !== "setup_peek") return { error: "Not in setup." };
      const player = findPlayer(state, playerId);
      if (!player) return { error: "Player not found." };
      if (player.isWaiting)
        return { error: "You are waiting for the next game." };
      if (!SETUP_PEEK_SLOTS.includes(message.slot)) {
        return { error: "You can only peek the bottom two cards." };
      }
      if (player.setupPeekedSlots.includes(message.slot)) {
        return { error: "Already peeked that card." };
      }
      if (player.setupPeekedSlots.length >= SETUP_PEEKS) {
        return { error: "Already peeked twice." };
      }

      if (!slotHasCard(player, message.slot)) {
        return { error: "Invalid slot." };
      }

      const peekedCard = getHandCard(player, message.slot);
      if (!peekedCard) return { error: "Invalid slot." };

      player.setupPeekedSlots = [...player.setupPeekedSlots, message.slot];
      addLog(state, `${player.name} peeked at a card.`);

      const allReady = state.players
        .filter(isPlayingPlayer)
        .every((p) => p.setupPeekedSlots.length >= SETUP_PEEKS);
      if (allReady) {
        state.phase = "playing";
        state.currentPlayerIndex = firstActivePlayerIndex(state);
        const first = currentPlayer(state);
        if (first) addLog(state, `${first.name}'s turn.`);
      }
      return {
        secretPeek: {
          playerId,
          slot: message.slot,
          card: peekedCard,
        },
        peekFlash: {
          kind: "setup_peek",
          actorId: playerId,
          playerId,
          slot: message.slot,
        },
      };
    }

    case "call_cambio": {
      if (state.phase !== "playing")
        return { error: "Cannot call Cambio now." };
      const player = currentPlayer(state);
      if (!player || player.id !== playerId) return { error: "Not your turn." };
      if (state.turnStarted) return { error: "Call Cambio before drawing." };
      if (state.drawnCard) return { error: "Already drew a card." };

      player.hasCalledCambio = true;
      state.cambioCallerId = playerId;
      state.phase = "cambio_final";
      addLog(state, `${player.name} called CAMBIO!`);

      const othersNeedTurn = state.players.some(
        (p) => p.id !== playerId && !p.finalTurnDone && isPlayingPlayer(p),
      );
      if (!othersNeedTurn) {
        endRound(state);
      } else {
        advanceTurn(state);
      }
      return { cambioFlash: { playerId } };
    }

    case "draw": {
      const player = currentPlayer(state);
      if (!player || player.id !== playerId) return { error: "Not your turn." };
      if (state.pendingAbility)
        return { error: "Resolve the special ability first." };
      if (state.phase !== "playing" && state.phase !== "cambio_final") {
        return { error: "Cannot draw now." };
      }
      if (state.drawnCard) return { error: "Already drew a card." };

      state.turnStarted = true;

      if (message.source === "deck") {
        if (state.deck.length === 0) {
          if (state.discard.length <= 1) return { error: "No cards to draw." };
          const top = state.discard.pop();
          if (!top) return { error: "No cards to draw." };
          state.deck = shuffle([...state.discard, top]);
          state.discard = [];
          clearSnapEligibleDiscard(state);
        }
        const card = state.deck.pop();
        if (!card) return { error: "No cards to draw." };
        state.drawnCard = card;
        state.drawnFromDiscard = false;
        addLog(state, `${player.name} drew from the deck.`);
        return {};
      }

      if (state.discard.length === 0)
        return { error: "Discard pile is empty." };
      const card = state.discard.pop();
      if (!card) return { error: "Discard pile is empty." };
      clearSnapEligibleDiscard(state);
      state.drawnCard = card;
      state.drawnFromDiscard = true;
      addLog(state, `${player.name} drew from the discard pile.`);
      return {};
    }

    case "swap": {
      const player = currentPlayer(state);
      if (!player || player.id !== playerId) return { error: "Not your turn." };
      if (!state.drawnCard) return { error: "Draw a card first." };
      if (!isValidHandSlot(player, message.slot))
        return { error: "Invalid slot." };

      const drawnCard = state.drawnCard;
      const existing = player.hand[message.slot];
      player.hand[message.slot] = { card: drawnCard, faceUp: false };
      if (existing.card) {
        state.discard.push(existing.card);
        markDiscardTopSnapEligible(state, existing.card);
      }
      state.drawnCard = null;
      addLog(state, `${player.name} swapped a card.`);

      tryPassTurnAfterAction(state, playerId);
      return {
        swapFlash: {
          slots: [{ playerId: player.id, slot: message.slot }],
        },
      };
    }

    case "discard_drawn": {
      const player = currentPlayer(state);
      if (!player || player.id !== playerId) return { error: "Not your turn." };
      if (!state.drawnCard) return { error: "No drawn card." };
      if (state.drawnFromDiscard) return { error: "Must swap discard draws." };

      const card = state.drawnCard;
      state.discard.push(card);
      markDiscardTopSnapEligible(state, card);
      state.drawnCard = null;
      addLog(state, `${player.name} discarded ${card.rank}.`);

      const ability = abilityForDiscard(card);
      if (ability) triggerAbility(state, playerId, ability);

      tryPassTurnAfterAction(state, playerId);
      return {};
    }

    case "snap": {
      const player = findPlayer(state, playerId);
      if (!player) return { error: "Player not found." };
      if (isSnapResolutionPending(state)) {
        return { error: "Another player is resolving a snap." };
      }
      if (!canPlayerSnap(state)) {
        return { error: "No snap available right now." };
      }
      if (
        state.phase !== "playing" &&
        state.phase !== "cambio_final" &&
        state.phase !== "snap_window"
      ) {
        return { error: "Cannot snap now." };
      }
      if (state.pendingAbility?.playerId === playerId) {
        return { error: "Resolve your pending action first." };
      }
      if (player.hasCalledCambio && state.phase === "cambio_final") {
        return { error: "Cambio caller cannot snap." };
      }
      const turnPlayer = currentPlayer(state);
      if (
        state.phase !== "snap_window" &&
        turnPlayer?.id === playerId &&
        state.drawnCard
      ) {
        return { error: "Swap or discard your drawn card before snapping." };
      }
      if (state.discard.length === 0) return { error: "Nothing to snap." };

      const target = findPlayer(state, message.targetPlayerId);
      if (!target) return { error: "Player not found." };
      if (!isValidHandSlot(target, message.slot)) {
        return { error: "Invalid slot." };
      }
      if (!slotHasCard(target, message.slot)) {
        return { error: "No card in that slot." };
      }
      if (
        message.targetPlayerId !== playerId &&
        !canTargetPlayer(message.targetPlayerId, state)
      ) {
        return { error: "That player's cards are protected." };
      }

      const top = state.discard[state.discard.length - 1];
      const handCard = getHandCard(target, message.slot);
      if (!handCard) return { error: "No card in that slot." };

      if (!cardsSnapMatch(handCard, top)) {
        const penaltySlot = addPenalty(state, playerId);
        if (message.targetPlayerId !== playerId) {
          addLog(
            state,
            `${player.name} wrong snap on ${target.name}'s card — penalty!`,
          );
        } else {
          addLog(state, `${player.name} snapped wrong — penalty!`);
        }
        return {
          error: "Wrong snap! Penalty card added.",
          penaltyFlash:
            penaltySlot !== null ? { playerId, slot: penaltySlot } : undefined,
        };
      }

      clearHandSlot(target.hand, message.slot);
      state.discard.push(handCard);
      if (state.phase === "snap_window") {
        clearSnapEligibleDiscard(state);
      } else {
        markDiscardTopSnapEligible(state, handCard);
      }

      if (message.targetPlayerId === playerId) {
        addLog(state, `${player.name} snapped correctly!`);
        return {};
      }

      state.pendingAbility = {
        playerId,
        kind: "snap_give",
        lookedCards: [],
        maxLooks: 0,
        snapTargetPlayerId: message.targetPlayerId,
      };
      addLog(
        state,
        `${player.name} snapped ${target.name}'s card — give them one of yours.`,
      );
      return {};
    }

    case "snap_give": {
      const pending = state.pendingAbility;
      if (
        !pending ||
        pending.kind !== "snap_give" ||
        pending.playerId !== playerId
      ) {
        return { error: "No snap give pending." };
      }
      const recipientId = pending.snapTargetPlayerId;
      if (!recipientId) return { error: "Invalid snap target." };

      const snapper = findPlayer(state, playerId);
      const recipient = findPlayer(state, recipientId);
      if (!snapper || !recipient) return { error: "Player not found." };
      if (!slotHasCard(snapper, message.slot)) {
        return { error: "Invalid slot." };
      }

      const givenCard = getHandCard(snapper, message.slot);
      if (!givenCard) return { error: "Invalid slot." };
      clearHandSlot(snapper.hand, message.slot);
      placeCardInHand(recipient.hand, givenCard);
      state.pendingAbility = null;
      addLog(
        state,
        `${snapper.name} gave a card to ${recipient.name} after snapping.`,
      );
      return {};
    }

    case "toggle_debug": {
      if (playerId !== state.hostId) {
        return { error: "Only the host can toggle debug mode." };
      }
      state.debugReveal = !state.debugReveal;
      addLog(
        state,
        state.debugReveal
          ? "Debug: all cards visible."
          : "Debug: cards hidden.",
      );
      return {};
    }

    case "restart_game": {
      if (playerId !== state.hostId) {
        return { error: "Only the host can restart the game." };
      }
      if (state.phase === "lobby") {
        return { error: "No game to restart." };
      }
      const participants = state.players.filter(isParticipant);
      if (participants.length < MIN_PLAYERS) {
        return { error: `Need at least ${MIN_PLAYERS} players.` };
      }
      dealHands(state);
      addLog(state, "Debug: game restarted.");
      return {};
    }

    case "show_results": {
      if (playerId !== state.hostId) {
        return { error: "Only the host can show results." };
      }
      if (state.phase !== "revealed") {
        return { error: "Cannot show results now." };
      }
      finalizeRound(state);
      return {};
    }

    case "add_bot": {
      if (playerId !== state.hostId) {
        return { error: "Only the host can add bots." };
      }
      if (!state.isSoloMode) {
        return { error: "Bots are only available in solo mode." };
      }
      if (state.phase !== "lobby" && state.phase !== "ended") {
        return { error: "Cannot add bots during a game." };
      }
      if (state.players.length >= MAX_PLAYERS) {
        return { error: "Room is full." };
      }
      const difficulty = message.difficulty ?? state.soloDifficulty ?? "easy";
      addBotPlayer(state, difficulty);
      return {};
    }

    case "remove_bot": {
      if (playerId !== state.hostId) {
        return { error: "Only the host can remove bots." };
      }
      if (!state.isSoloMode) {
        return { error: "Bots are only available in solo mode." };
      }
      if (state.phase !== "lobby" && state.phase !== "ended") {
        return { error: "Cannot remove bots during a game." };
      }
      const bot = findPlayer(state, message.playerId);
      if (!bot?.isBot) {
        return { error: "That player is not a bot." };
      }
      state.players = state.players.filter((p) => p.id !== message.playerId);
      addLog(state, `${bot.name} left.`);
      return {};
    }

    case "set_joker_count": {
      if (playerId !== state.hostId) {
        return { error: "Only the host can change joker count." };
      }
      if (state.phase !== "lobby" && state.phase !== "ended") {
        return { error: "Cannot change joker count during a game." };
      }
      const count = Math.min(
        MAX_JOKER_COUNT,
        Math.max(MIN_JOKER_COUNT, message.count),
      );
      if (count === state.jokerCount) return {};
      state.jokerCount = count;
      addLog(state, `Jokers set to ${count}.`);
      return {};
    }

    case "chat": {
      const result = addChatMessage(state, playerId, message.text);
      if ("error" in result) return { error: result.error };
      return {};
    }

    case "ability_look": {
      const pending = state.pendingAbility;
      if (!pending || pending.playerId !== playerId) {
        return { error: "No look ability pending." };
      }
      if (
        pending.kind !== "peek_own" &&
        pending.kind !== "spy" &&
        pending.kind !== "queen_look" &&
        pending.kind !== "king_look"
      ) {
        return { error: "Not a look ability." };
      }

      const target = findPlayer(state, message.playerId);
      if (!target) return { error: "Player not found." };
      if (!isValidHandSlot(target, message.slot))
        return { error: "Invalid slot." };
      if (!slotHasCard(target, message.slot)) {
        return { error: "No card in that slot." };
      }

      if (pending.kind === "peek_own" && message.playerId !== playerId) {
        return { error: "Peek your own cards only." };
      }
      if (pending.kind === "spy" && message.playerId === playerId) {
        return { error: "Spy an opponent's card." };
      }
      if (
        (pending.kind === "spy" ||
          pending.kind === "queen_look" ||
          pending.kind === "king_look") &&
        !canTargetPlayer(message.playerId, state) &&
        message.playerId !== playerId
      ) {
        return { error: "That player is protected." };
      }

      if (pending.lookedCards.length >= pending.maxLooks) {
        return { error: "Already looked enough cards." };
      }

      const card = getHandCard(target, message.slot);
      if (!card) return { error: "No card in that slot." };
      pending.lookedCards.push({
        playerId: message.playerId,
        slot: message.slot,
        card,
      });

      if (pending.kind === "peek_own") {
        state.pendingAbility = null;
      } else if (pending.kind === "spy") {
        state.pendingAbility = null;
      } else {
        completeAbilityIfDone(state);
      }

      addLog(state, `${findPlayer(state, playerId)?.name} looked at a card.`);

      tryPassTurnAfterAction(state, playerId);

      const peekKind: PeekFlashKind =
        pending.kind === "spy"
          ? "spy"
          : pending.kind === "peek_own"
            ? "peek_own"
            : "look";

      return {
        secretPeek: {
          playerId: message.playerId,
          slot: message.slot,
          card,
        },
        peekFlash: {
          kind: peekKind,
          actorId: playerId,
          playerId: message.playerId,
          slot: message.slot,
        },
      };
    }

    case "ability_swap": {
      const pending = state.pendingAbility;
      if (!pending || pending.playerId !== playerId) {
        return { error: "No swap ability pending." };
      }
      if (
        pending.kind !== "blind_switch" &&
        pending.kind !== "queen_swap" &&
        pending.kind !== "king_swap"
      ) {
        return { error: "Not a swap ability." };
      }

      const fromPlayer = findPlayer(state, message.fromPlayerId);
      const toPlayer = findPlayer(state, message.toPlayerId);
      if (!fromPlayer || !toPlayer) return { error: "Player not found." };
      if (!isValidHandSlot(fromPlayer, message.fromSlot)) {
        return { error: "Invalid source slot." };
      }
      if (!isValidHandSlot(toPlayer, message.toSlot)) {
        return { error: "Invalid target slot." };
      }
      if (
        message.fromPlayerId === message.toPlayerId &&
        message.fromSlot === message.toSlot
      ) {
        return { error: "Pick two different cards." };
      }
      if (!canTargetPlayer(message.fromPlayerId, state)) {
        return { error: "That player's cards are protected." };
      }
      if (!canTargetPlayer(message.toPlayerId, state)) {
        return { error: "That player's cards are protected." };
      }

      const ok = swapSlots(
        state,
        message.fromPlayerId,
        message.fromSlot,
        message.toPlayerId,
        message.toSlot,
      );
      if (!ok) return { error: "Swap failed." };

      state.pendingAbility = null;
      addLog(
        state,
        `${findPlayer(state, playerId)?.name} swapped cards on the table.`,
      );
      tryPassTurnAfterAction(state, playerId);
      return {
        swapFlash: {
          slots: [
            { playerId: message.fromPlayerId, slot: message.fromSlot },
            { playerId: message.toPlayerId, slot: message.toSlot },
          ],
        },
      };
    }

    default:
      return { error: "Unknown message type." };
  }
}

export function buildPlayerView(
  state: GameState,
  viewerId: string,
): PlayerView {
  const viewer = findPlayer(state, viewerId);
  const current = currentPlayer(state);
  const viewerWaiting = viewer?.isWaiting ?? false;
  const snapWindowActive = state.phase === "snap_window";
  const gameInteractive =
    !viewerWaiting &&
    state.phase !== "lobby" &&
    state.phase !== "ended" &&
    state.phase !== "snap_window" &&
    state.phase !== "revealed";
  const snapInteractive = snapWindowActive && !viewerWaiting;

  const participants = state.players.filter(isParticipant);

  const players = state.players.map((p) => {
    return {
      id: p.id,
      name: p.name,
      hand: p.hand.map((slot) => {
        if (!slot.card) {
          return {
            card: null,
            faceUp: false,
            hidden: false,
            empty: true,
          };
        }
        const reveal = state.debugReveal || slot.faceUp;
        return {
          card: reveal ? slot.card : null,
          faceUp: reveal,
          hidden: !reveal,
          isPenalty: slot.isPenalty ? true : undefined,
        };
      }),
      penaltyCount: p.penaltyCount,
      hasCalledCambio: p.hasCalledCambio,
      finalTurnDone: p.finalTurnDone,
      isWaiting: p.isWaiting,
      connected: p.connected,
      isBot: p.isBot,
      isHost: p.id === state.hostId,
      isCurrentTurn: current?.id === p.id,
      isThinking: state.botThinkingId === p.id,
    };
  });

  const isMyTurn = current?.id === viewerId && gameInteractive;
  const canCallCambio =
    isMyTurn &&
    state.phase === "playing" &&
    !state.turnStarted &&
    !state.drawnCard &&
    !viewer?.hasCalledCambio;

  return {
    roomId: state.roomId,
    playerId: viewerId,
    phase: state.phase,
    players,
    currentPlayerIndex: state.currentPlayerIndex,
    deckCount:
      state.phase === "lobby"
        ? deckSize(state.jokerCount)
        : state.deck.length,
    discardTop:
      state.discard.length > 0 ? state.discard[state.discard.length - 1] : null,
    drawnCard: isMyTurn ? state.drawnCard : null,
    drawnFromDiscard: isMyTurn ? state.drawnFromDiscard : false,
    hasDrawnCard: !!state.drawnCard,
    canCallCambio,
    canDraw:
      gameInteractive &&
      isMyTurn &&
      !state.turnStarted &&
      !state.drawnCard &&
      !state.pendingAbility &&
      (state.phase === "playing" || state.phase === "cambio_final"),
    canSwap:
      gameInteractive && isMyTurn && !!state.drawnCard && !state.pendingAbility,
    canDiscardDrawn:
      gameInteractive &&
      isMyTurn &&
      !!state.drawnCard &&
      !state.drawnFromDiscard &&
      !state.pendingAbility,
    canSnap:
      (gameInteractive || snapInteractive) &&
      canPlayerSnap(state) &&
      !isSnapResolutionPending(state) &&
      !(viewer?.hasCalledCambio && state.phase === "cambio_final") &&
      !(gameInteractive && isMyTurn && state.drawnCard) &&
      state.pendingAbility?.playerId !== viewerId,
    pendingAbility:
      (gameInteractive || snapInteractive) &&
      state.pendingAbility?.playerId === viewerId
        ? state.pendingAbility
        : null,
    debugReveal: state.debugReveal,
    isWaiting: viewerWaiting,
    canStartGame:
      viewerId === state.hostId &&
      (state.phase === "lobby" || state.phase === "ended") &&
      participants.length >= MIN_PLAYERS,
    canShowResults: viewerId === state.hostId && state.phase === "revealed",
    roundNumber: state.roundNumber,
    roundHistory: migrateRoundHistory(state.roundHistory),
    cumulativeScores: { ...(state.cumulativeScores ?? {}) },
    cambioCallerId: state.cambioCallerId,
    winnerIds: state.winnerIds,
    scores: state.scores,
    snapWindowEndsAt: state.snapWindowEndsAt,
    isSoloMode: state.isSoloMode,
    canAddBot:
      viewerId === state.hostId &&
      state.isSoloMode &&
      (state.phase === "lobby" || state.phase === "ended") &&
      state.players.length < MAX_PLAYERS,
    jokerCount: state.jokerCount,
    canSetJokerCount:
      viewerId === state.hostId &&
      (state.phase === "lobby" || state.phase === "ended"),
    log: state.log,
    chatMessages: state.chatMessages,
  };
}
