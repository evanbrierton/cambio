import { abilityForDiscard, cardPoints, cardsSnapMatch } from "./cards";
import type {
  BotDifficulty,
  Card,
  ClientMessage,
  GameState,
  PlayerState,
} from "./types";
import { SETUP_PEEK_SLOTS } from "./types";

const SETUP_PEEKS = 2;

function isSmart(difficulty: BotDifficulty): boolean {
  return difficulty === "medium" || difficulty === "hard";
}

function isExpert(difficulty: BotDifficulty): boolean {
  return difficulty === "hard";
}

function cambioThreshold(difficulty: BotDifficulty): number {
  if (difficulty === "hard") return 6;
  if (difficulty === "medium") return 10;
  return 8;
}

function cardKey(playerId: string, slot: number): string {
  return `${playerId}:${slot}`;
}

export class BotKnowledge {
  private known = new Map<string, Card>();

  remember(playerId: string, slot: number, card: Card): void {
    this.known.set(cardKey(playerId, slot), card);
  }

  get(playerId: string, slot: number): Card | undefined {
    return this.known.get(cardKey(playerId, slot));
  }

  points(playerId: string, slot: number): number | null {
    const card = this.get(playerId, slot);
    return card ? cardPoints(card) : null;
  }
}

function findPlayer(state: GameState, id: string): PlayerState | undefined {
  return state.players.find((p) => p.id === id);
}

function isPlayingPlayer(player: PlayerState): boolean {
  return !player.isWaiting && player.hand.length > 0;
}

function currentPlayer(state: GameState): PlayerState | undefined {
  return state.players[state.currentPlayerIndex];
}

function slotHasCard(player: PlayerState, slot: number): boolean {
  return (
    slot >= 0 && slot < player.hand.length && player.hand[slot].card !== null
  );
}

function getHandCard(player: PlayerState, slot: number): Card | null {
  if (!slotHasCard(player, slot)) return null;
  return player.hand[slot].card;
}

function isProtected(playerId: string, state: GameState): boolean {
  return state.cambioCallerId === playerId && state.phase === "cambio_final";
}

function canTargetPlayer(playerId: string, state: GameState): boolean {
  return !isProtected(playerId, state);
}

function isSnapEligible(state: GameState): boolean {
  if (state.discard.length === 0 || !state.snapEligibleTopCardId) return false;
  const top = state.discard[state.discard.length - 1];
  return top.id === state.snapEligibleTopCardId;
}

function canAttemptSnap(state: GameState): boolean {
  if (state.discard.length === 0) return false;
  return isSnapEligible(state) || state.phase === "snap_window";
}

function isSnapResolutionPending(state: GameState): boolean {
  return state.pendingAbility?.kind === "snap_give";
}

function canBotSnap(state: GameState, bot: PlayerState): boolean {
  if (!bot.isBot || bot.isWaiting) return false;
  if (!canAttemptSnap(state)) return false;
  if (isSnapResolutionPending(state)) return false;
  if (bot.hasCalledCambio && state.phase === "cambio_final") return false;
  if (state.pendingAbility?.playerId === bot.id) return false;

  const turnPlayer = currentPlayer(state);
  if (
    state.phase !== "snap_window" &&
    turnPlayer?.id === bot.id &&
    state.drawnCard
  ) {
    return false;
  }

  return true;
}

function estimateSlotPoints(
  state: GameState,
  botId: string,
  playerId: string,
  slot: number,
  knowledge: BotKnowledge,
): number {
  const known = knowledge.points(playerId, slot);
  if (known !== null) return known;
  if (playerId === botId) {
    const player = findPlayer(state, botId);
    if (player) {
      const card = getHandCard(player, slot);
      if (card) return cardPoints(card);
    }
  }
  return 10;
}

function estimateHandTotal(
  state: GameState,
  botId: string,
  knowledge: BotKnowledge,
): number {
  const player = findPlayer(state, botId);
  if (!player) return 99;
  let total = 0;
  for (let slot = 0; slot < player.hand.length; slot++) {
    if (!slotHasCard(player, slot)) continue;
    total += estimateSlotPoints(state, botId, botId, slot, knowledge);
  }
  return total;
}

function worstKnownSlot(
  state: GameState,
  botId: string,
  knowledge: BotKnowledge,
): number {
  const player = findPlayer(state, botId);
  if (!player) return 0;

  let worstSlot = 0;
  let worstPoints = Number.NEGATIVE_INFINITY;
  for (let slot = 0; slot < player.hand.length; slot++) {
    if (!slotHasCard(player, slot)) continue;
    const pts = estimateSlotPoints(state, botId, botId, slot, knowledge);
    if (pts > worstPoints) {
      worstPoints = pts;
      worstSlot = slot;
    }
  }
  return worstSlot;
}

function bestUnknownOpponentSlot(
  state: GameState,
  botId: string,
  knowledge: BotKnowledge,
): { playerId: string; slot: number } | null {
  let best: { playerId: string; slot: number; points: number } | null = null;

  for (const opponent of state.players) {
    if (opponent.id === botId || opponent.isWaiting) continue;
    if (!canTargetPlayer(opponent.id, state)) continue;

    for (let slot = 0; slot < opponent.hand.length; slot++) {
      if (!slotHasCard(opponent, slot)) continue;
      const pts = estimateSlotPoints(
        state,
        botId,
        opponent.id,
        slot,
        knowledge,
      );
      if (!best || pts > best.points) {
        best = { playerId: opponent.id, slot, points: pts };
      }
    }
  }

  return best ? { playerId: best.playerId, slot: best.slot } : null;
}

function bestLookTarget(
  state: GameState,
  botId: string,
  knowledge: BotKnowledge,
  preferOpponent: boolean,
): { playerId: string; slot: number } | null {
  if (preferOpponent) {
    const opponent = bestUnknownOpponentSlot(state, botId, knowledge);
    if (opponent) return opponent;
  }

  let best: { playerId: string; slot: number; points: number } | null = null;
  for (const player of state.players) {
    if (!canTargetPlayer(player.id, state) && player.id !== botId) continue;
    for (let slot = 0; slot < player.hand.length; slot++) {
      if (!slotHasCard(player, slot)) continue;
      if (knowledge.get(player.id, slot)) continue;
      const pts = estimateSlotPoints(state, botId, player.id, slot, knowledge);
      if (!best || pts > best.points) {
        best = { playerId: player.id, slot, points: pts };
      }
    }
  }
  return best ? { playerId: best.playerId, slot: best.slot } : null;
}

function firstUnknownOwnSlot(
  state: GameState,
  botId: string,
  knowledge: BotKnowledge,
): number | null {
  const bot = findPlayer(state, botId);
  if (!bot) return null;
  for (let slot = 0; slot < bot.hand.length; slot++) {
    if (slotHasCard(bot, slot) && knowledge.get(botId, slot) === undefined) {
      return slot;
    }
  }
  return null;
}

function snapMatchScore(
  botId: string,
  match: { targetPlayerId: string; slot: number },
  knowledge: BotKnowledge,
): number {
  const known = knowledge.get(match.targetPlayerId, match.slot);
  const pts = known ? cardPoints(known) : 8;
  if (match.targetPlayerId !== botId) return pts + 10;
  return pts;
}

function randomItem<T>(items: T[]): T | null {
  if (items.length === 0) return null;
  return items[Math.floor(Math.random() * items.length)] ?? null;
}

function findSnapTarget(
  state: GameState,
  botId: string,
  knowledge: BotKnowledge,
  difficulty: BotDifficulty,
): { targetPlayerId: string; slot: number } | null {
  if (state.discard.length === 0) return null;
  const top = state.discard[state.discard.length - 1];

  const matches: Array<{ targetPlayerId: string; slot: number }> = [];

  for (const player of state.players) {
    if (!canTargetPlayer(player.id, state) && player.id !== botId) continue;
    for (let slot = 0; slot < player.hand.length; slot++) {
      if (!slotHasCard(player, slot)) continue;
      const known = knowledge.get(player.id, slot);
      if (known && cardsSnapMatch(known, top)) {
        matches.push({ targetPlayerId: player.id, slot });
      }
      if (player.id === botId) {
        const own = getHandCard(player, slot);
        if (own && cardsSnapMatch(own, top)) {
          if (
            !matches.some((m) => m.targetPlayerId === botId && m.slot === slot)
          ) {
            matches.push({ targetPlayerId: botId, slot });
          }
        }
      }
    }
  }

  if (matches.length === 0) return null;

  if (difficulty === "easy") {
    const own = matches.filter((m) => m.targetPlayerId === botId);
    return randomItem(own.length > 0 ? own : matches);
  }

  if (isExpert(difficulty)) {
    return (
      [...matches].sort(
        (a, b) =>
          snapMatchScore(botId, b, knowledge) -
          snapMatchScore(botId, a, knowledge),
      )[0] ?? null
    );
  }

  const own = matches.find((m) => m.targetPlayerId === botId);
  if (own) return own;
  return matches[0] ?? null;
}

function decideAbility(
  state: GameState,
  botId: string,
  knowledge: BotKnowledge,
  difficulty: BotDifficulty,
): ClientMessage | null {
  const pending = state.pendingAbility;
  if (!pending || pending.playerId !== botId) return null;

  if (pending.kind === "snap_give") {
    const bot = findPlayer(state, botId);
    if (!bot) return null;
    const worst = worstKnownSlot(state, botId, knowledge);
    return { type: "snap_give", slot: worst };
  }

  if (
    pending.kind === "peek_own" ||
    pending.kind === "spy" ||
    pending.kind === "queen_look" ||
    pending.kind === "king_look"
  ) {
    if (pending.kind === "peek_own") {
      const bot = findPlayer(state, botId);
      if (!bot) return null;
      if (isExpert(difficulty)) {
        const slot = firstUnknownOwnSlot(state, botId, knowledge);
        if (slot !== null) {
          return { type: "ability_look", playerId: botId, slot };
        }
      }
      const unknown = bot.hand
        .map((_, slot) => slot)
        .filter(
          (slot) =>
            slotHasCard(bot, slot) && knowledge.get(botId, slot) === undefined,
        );
      const slot =
        randomItem(unknown) ?? worstKnownSlot(state, botId, knowledge);
      return { type: "ability_look", playerId: botId, slot };
    }

    if (pending.kind === "spy") {
      if (isSmart(difficulty)) {
        const target = bestUnknownOpponentSlot(state, botId, knowledge);
        if (target) {
          return {
            type: "ability_look",
            playerId: target.playerId,
            slot: target.slot,
          };
        }
      }
      const candidates: Array<{ playerId: string; slot: number }> = [];
      for (const opponent of state.players) {
        if (opponent.id === botId || !canTargetPlayer(opponent.id, state))
          continue;
        for (let slot = 0; slot < opponent.hand.length; slot++) {
          if (slotHasCard(opponent, slot)) {
            candidates.push({ playerId: opponent.id, slot });
          }
        }
      }
      const pick = randomItem(candidates);
      if (!pick) return null;
      return { type: "ability_look", playerId: pick.playerId, slot: pick.slot };
    }

    const lookTarget = isSmart(difficulty)
      ? bestLookTarget(state, botId, knowledge, isExpert(difficulty))
      : null;
    if (lookTarget) {
      return {
        type: "ability_look",
        playerId: lookTarget.playerId,
        slot: lookTarget.slot,
      };
    }

    const lookTargets: Array<{ playerId: string; slot: number }> = [];
    for (const player of state.players) {
      if (!canTargetPlayer(player.id, state) && player.id !== botId) continue;
      for (let slot = 0; slot < player.hand.length; slot++) {
        if (slotHasCard(player, slot)) {
          lookTargets.push({ playerId: player.id, slot });
        }
      }
    }
    const pick = randomItem(lookTargets);
    if (!pick) return null;
    return { type: "ability_look", playerId: pick.playerId, slot: pick.slot };
  }

  if (
    pending.kind === "blind_switch" ||
    pending.kind === "queen_swap" ||
    pending.kind === "king_swap"
  ) {
    const bot = findPlayer(state, botId);
    if (!bot) return null;

    const ownSlots = bot.hand
      .map((_, slot) => slot)
      .filter((slot) => slotHasCard(bot, slot));

    if (isSmart(difficulty)) {
      const ownWorst = worstKnownSlot(state, botId, knowledge);
      const target = bestUnknownOpponentSlot(state, botId, knowledge);
      if (target) {
        return {
          type: "ability_swap",
          fromPlayerId: botId,
          fromSlot: ownWorst,
          toPlayerId: target.playerId,
          toSlot: target.slot,
        };
      }
    }

    const opponents = state.players.filter(
      (p) => p.id !== botId && canTargetPlayer(p.id, state),
    );
    const opponent = randomItem(opponents);
    if (!opponent) return null;
    const fromSlot = randomItem(ownSlots) ?? 0;
    const oppSlots = opponent.hand
      .map((_, slot) => slot)
      .filter((slot) => slotHasCard(opponent, slot));
    const toSlot = randomItem(oppSlots) ?? 0;
    return {
      type: "ability_swap",
      fromPlayerId: botId,
      fromSlot,
      toPlayerId: opponent.id,
      toSlot,
    };
  }

  return null;
}

function decideTurn(
  state: GameState,
  botId: string,
  knowledge: BotKnowledge,
  difficulty: BotDifficulty,
): ClientMessage | null {
  const bot = findPlayer(state, botId);
  if (!bot) return null;

  if (state.phase === "playing" && !state.turnStarted && !state.drawnCard) {
    const threshold = cambioThreshold(difficulty);
    if (
      !bot.hasCalledCambio &&
      estimateHandTotal(state, botId, knowledge) <= threshold
    ) {
      return { type: "call_cambio" };
    }
  }

  if (!state.drawnCard && !state.pendingAbility) {
    if (state.phase !== "playing" && state.phase !== "cambio_final")
      return null;

    if (isSmart(difficulty) && state.discard.length > 0) {
      const top = state.discard[state.discard.length - 1];
      const worst = worstKnownSlot(state, botId, knowledge);
      const worstPts = estimateSlotPoints(
        state,
        botId,
        botId,
        worst,
        knowledge,
      );
      const topPts = cardPoints(top);
      const takeDiscard = isExpert(difficulty)
        ? topPts <= worstPts
        : topPts < worstPts;
      if (takeDiscard) {
        return { type: "draw", source: "discard" };
      }
    }

    return { type: "draw", source: "deck" };
  }

  if (state.drawnCard && !state.drawnFromDiscard) {
    const drawnPts = cardPoints(state.drawnCard);
    const worst = worstKnownSlot(state, botId, knowledge);
    const worstPts = estimateSlotPoints(state, botId, botId, worst, knowledge);

    if (drawnPts < worstPts) {
      return { type: "swap", slot: worst };
    }

    const ability = abilityForDiscard(state.drawnCard);
    if (difficulty === "easy" && ability && Math.random() < 0.35) {
      return { type: "discard_drawn" };
    }
    if (isSmart(difficulty) && ability) {
      return { type: "discard_drawn" };
    }

    return { type: "swap", slot: worst };
  }

  if (state.drawnCard && state.drawnFromDiscard) {
    const worst = worstKnownSlot(state, botId, knowledge);
    return { type: "swap", slot: worst };
  }

  return null;
}

export function collectActingBots(state: GameState): string[] {
  const ids: string[] = [];

  if (state.phase === "setup_peek") {
    for (const player of state.players) {
      if (
        player.isBot &&
        isPlayingPlayer(player) &&
        player.setupPeekedSlots.length < SETUP_PEEKS
      ) {
        ids.push(player.id);
      }
    }
    return ids;
  }

  if (state.pendingAbility?.playerId) {
    const actor = findPlayer(state, state.pendingAbility.playerId);
    if (actor?.isBot) ids.push(actor.id);
    return ids;
  }

  for (const bot of state.players) {
    if (canBotSnap(state, bot)) ids.push(bot.id);
  }

  const current = currentPlayer(state);
  if (current?.isBot && !ids.includes(current.id)) {
    ids.push(current.id);
  }

  return ids;
}

export function findNextActingBot(
  state: GameState,
  botThinkingId: string | null,
): string | null {
  if (botThinkingId) return null;

  if (
    state.phase === "lobby" ||
    state.phase === "ended" ||
    state.phase === "revealed"
  ) {
    return null;
  }

  return collectActingBots(state)[0] ?? null;
}

export function decideBotAction(
  state: GameState,
  botId: string,
  knowledge: BotKnowledge,
): ClientMessage | null {
  const bot = findPlayer(state, botId);
  if (!bot?.isBot) return null;
  const difficulty = bot.botDifficulty ?? "easy";

  if (state.phase === "setup_peek" && isPlayingPlayer(bot)) {
    const unpeeked = SETUP_PEEK_SLOTS.filter(
      (slot) => !bot.setupPeekedSlots.includes(slot),
    );
    const slot = unpeeked[0];
    if (slot !== undefined) return { type: "setup_peek", slot };
  }

  if (state.pendingAbility?.playerId === botId) {
    return decideAbility(state, botId, knowledge, difficulty);
  }

  if (canBotSnap(state, bot)) {
    const target = findSnapTarget(state, botId, knowledge, difficulty);
    if (target) {
      return {
        type: "snap",
        targetPlayerId: target.targetPlayerId,
        slot: target.slot,
      };
    }
  }

  const current = currentPlayer(state);
  if (current?.id === botId) {
    return decideTurn(state, botId, knowledge, difficulty);
  }

  return null;
}

export function updateBotKnowledge(
  knowledge: BotKnowledge,
  state: GameState,
  botId: string,
  message: ClientMessage,
  result: {
    secretPeek?: { playerId: string; slot: number; card: unknown };
  },
): void {
  const bot = findPlayer(state, botId);
  if (!bot?.isBot) return;

  if (message.type === "setup_peek") {
    const card = getHandCard(bot, message.slot);
    if (card) knowledge.remember(botId, message.slot, card);
  }

  if (result.secretPeek?.card) {
    knowledge.remember(
      result.secretPeek.playerId,
      result.secretPeek.slot,
      result.secretPeek.card as Card,
    );
  }

  if (
    message.type === "draw" &&
    message.source === "discard" &&
    state.drawnCard
  ) {
    knowledge.remember(botId, -1, state.drawnCard);
  }

  if (message.type === "swap") {
    const card = getHandCard(bot, message.slot);
    if (card) knowledge.remember(botId, message.slot, card);
  }

  if (message.type === "ability_look" && result.secretPeek?.card) {
    knowledge.remember(
      message.playerId,
      message.slot,
      result.secretPeek.card as Card,
    );
  }

  const pending = state.pendingAbility;
  if (pending?.lookedCards) {
    for (const entry of pending.lookedCards) {
      knowledge.remember(entry.playerId, entry.slot, entry.card);
    }
  }
}

export function botThinkDelay(difficulty: BotDifficulty): number {
  if (difficulty === "hard") {
    return 400 + Math.floor(Math.random() * 700);
  }
  if (difficulty === "medium") {
    return 600 + Math.floor(Math.random() * 900);
  }
  return 800 + Math.floor(Math.random() * 1400);
}
