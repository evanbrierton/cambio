import { abilityForDiscard, cardPoints, cardsSnapMatch } from "./cards";
import type {
  BotDifficulty,
  Card,
  CardPointValues,
  ClientMessage,
  GameState,
  PlayerState,
} from "./types";
import { DEFAULT_CARD_POINTS, SETUP_PEEK_SLOTS } from "./types";

const SETUP_PEEKS = 2;

interface DifficultyConfig {
  ownUnknownPoints: number;
  opponentUnknownPoints: number;
  cambioBaseThreshold: number;
  delayMinMs: number;
  delayMaxMs: number;
  hesitationChance: number;
  hesitationMinMs: number;
  hesitationMaxMs: number;
}

const BOT_DIFFICULTY_CONFIG: Record<BotDifficulty, DifficultyConfig> = {
  easy: {
    ownUnknownPoints: 10,
    opponentUnknownPoints: 11,
    cambioBaseThreshold: 8,
    delayMinMs: 1500,
    delayMaxMs: 3000,
    hesitationChance: 0.3,
    hesitationMinMs: 250,
    hesitationMaxMs: 700,
  },
  medium: {
    ownUnknownPoints: 9,
    opponentUnknownPoints: 10,
    cambioBaseThreshold: 9,
    delayMinMs: 1100,
    delayMaxMs: 2200,
    hesitationChance: 0.24,
    hesitationMinMs: 200,
    hesitationMaxMs: 550,
  },
  hard: {
    ownUnknownPoints: 8,
    opponentUnknownPoints: 9,
    cambioBaseThreshold: 10,
    delayMinMs: 850,
    delayMaxMs: 1700,
    hesitationChance: 0.18,
    hesitationMinMs: 150,
    hesitationMaxMs: 450,
  },
};

function randomInt(min: number, max: number): number {
  if (max <= min) {
    return min;
  }
  return min + Math.floor(Math.random() * (max - min + 1));
}

function isSmart(difficulty: BotDifficulty): boolean {
  return difficulty === "medium" || difficulty === "hard";
}

function isExpert(difficulty: BotDifficulty): boolean {
  return difficulty === "hard";
}

function cardKey(playerId: string, slot: number): string {
  return `${playerId}:${slot}`;
}

export class BotKnowledge {
  private readonly known = new Map<string, Card>();
  private roundNumber: number | null = null;
  private pointValues: CardPointValues = DEFAULT_CARD_POINTS;

  remember(playerId: string, slot: number, card: Card): void {
    this.known.set(cardKey(playerId, slot), card);
  }

  forget(playerId: string, slot: number): void {
    this.known.delete(cardKey(playerId, slot));
  }

  get(playerId: string, slot: number): Card | undefined {
    return this.known.get(cardKey(playerId, slot));
  }

  points(playerId: string, slot: number): number | null {
    const card = this.get(playerId, slot);
    return card ? cardPoints(card, this.pointValues) : null;
  }

  prepareForState(state: GameState): void {
    if (this.roundNumber !== state.roundNumber) {
      this.known.clear();
      this.roundNumber = state.roundNumber;
    }
    this.pointValues = state.cardPoints;

    for (const player of state.players) {
      for (let slot = 0; slot < player.hand.length; slot += 1) {
        const handSlot = player.hand[slot];
        if (!handSlot?.card) {
          this.forget(player.id, slot);
          continue;
        }
        if (handSlot.faceUp) {
          this.remember(player.id, slot, handSlot.card);
        }
      }
    }
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
  if (!slotHasCard(player, slot)) {
    return null;
  }
  return player.hand[slot].card;
}

function isProtected(playerId: string, state: GameState): boolean {
  return state.cambioCallerId === playerId && state.phase === "cambio_final";
}

function canTargetPlayer(playerId: string, state: GameState): boolean {
  return !isProtected(playerId, state);
}

function isSnapEligible(state: GameState): boolean {
  if (state.discard.length === 0 || !state.snapEligibleTopCardId) {
    return false;
  }
  const top = state.discard[state.discard.length - 1];
  return top.id === state.snapEligibleTopCardId;
}

function canAttemptSnap(state: GameState): boolean {
  if (state.discard.length === 0) {
    return false;
  }
  return isSnapEligible(state) || state.phase === "snap_window";
}

function isSnapResolutionPending(state: GameState): boolean {
  return state.pendingAbility?.kind === "snap_give";
}

function canBotSnap(state: GameState, bot: PlayerState): boolean {
  if (!bot.isBot || bot.isWaiting) {
    return false;
  }
  if (!canAttemptSnap(state)) {
    return false;
  }
  if (state.snapChainPlayerId && state.snapChainPlayerId !== bot.id) {
    return false;
  }
  if (isSnapResolutionPending(state)) {
    return false;
  }
  if (bot.hasCalledCambio && state.phase === "cambio_final") {
    return false;
  }
  if (state.pendingAbility?.playerId === bot.id) {
    return false;
  }

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
  botId: string,
  playerId: string,
  slot: number,
  knowledge: BotKnowledge,
  difficulty: BotDifficulty,
): number {
  const known = knowledge.points(playerId, slot);
  if (known !== null) {
    return known;
  }

  const config = BOT_DIFFICULTY_CONFIG[difficulty];
  return playerId === botId
    ? config.ownUnknownPoints
    : config.opponentUnknownPoints;
}

function estimatePlayerHandTotal(
  state: GameState,
  botId: string,
  playerId: string,
  knowledge: BotKnowledge,
  difficulty: BotDifficulty,
): number {
  const player = findPlayer(state, playerId);
  if (!player) {
    return 99;
  }

  let total = 0;
  for (let slot = 0; slot < player.hand.length; slot += 1) {
    if (!slotHasCard(player, slot)) {
      continue;
    }
    total += estimateSlotPoints(botId, playerId, slot, knowledge, difficulty);
  }
  return total;
}

function estimateHandTotal(
  state: GameState,
  botId: string,
  knowledge: BotKnowledge,
  difficulty: BotDifficulty,
): number {
  return estimatePlayerHandTotal(state, botId, botId, knowledge, difficulty);
}

interface StandingProjection {
  playerId: string;
  projectedTotal: number;
}

function projectedStandings(
  state: GameState,
  botId: string,
  knowledge: BotKnowledge,
  difficulty: BotDifficulty,
): StandingProjection[] {
  const standings: StandingProjection[] = [];

  for (const player of state.players) {
    if (!isPlayingPlayer(player)) {
      continue;
    }
    const currentTotal = state.cumulativeScores[player.id] ?? 0;
    const estimatedRoundTotal = estimatePlayerHandTotal(
      state,
      botId,
      player.id,
      knowledge,
      difficulty,
    );
    standings.push({
      playerId: player.id,
      projectedTotal: currentTotal + estimatedRoundTotal,
    });
  }

  return standings.sort((a, b) => a.projectedTotal - b.projectedTotal);
}

function standingsAwareCambioThreshold(
  state: GameState,
  botId: string,
  knowledge: BotKnowledge,
  difficulty: BotDifficulty,
): number {
  const config = BOT_DIFFICULTY_CONFIG[difficulty];
  let threshold = config.cambioBaseThreshold;

  const opponents = state.players.filter(
    (player) => player.id !== botId && isPlayingPlayer(player),
  );
  if (opponents.length === 0) {
    return threshold;
  }

  const botCumulative = state.cumulativeScores[botId] ?? 0;
  const bestOpponentCumulative = Math.min(
    ...opponents.map((player) => state.cumulativeScores[player.id] ?? 0),
  );
  const cumulativeGap = botCumulative - bestOpponentCumulative;

  if (cumulativeGap <= -10) {
    threshold -= 3;
  } else if (cumulativeGap <= -5) {
    threshold -= 2;
  } else if (cumulativeGap <= -2) {
    threshold -= 1;
  } else if (cumulativeGap >= 12) {
    threshold += 2;
  } else if (cumulativeGap >= 6) {
    threshold += 1;
  }

  const standings = projectedStandings(state, botId, knowledge, difficulty);
  const botStandingIndex = standings.findIndex(
    (entry) => entry.playerId === botId,
  );
  if (botStandingIndex > 0) {
    threshold -= difficulty === "hard" ? 0 : 1;
  }

  return Math.max(3, Math.min(16, threshold));
}

function shouldCallCambio(
  state: GameState,
  botId: string,
  knowledge: BotKnowledge,
  difficulty: BotDifficulty,
): boolean {
  const estimate = estimateHandTotal(state, botId, knowledge, difficulty);
  const threshold = standingsAwareCambioThreshold(
    state,
    botId,
    knowledge,
    difficulty,
  );
  if (estimate > threshold) {
    return false;
  }

  const standings = projectedStandings(state, botId, knowledge, difficulty);
  const botStandingIndex = standings.findIndex(
    (entry) => entry.playerId === botId,
  );
  if (botStandingIndex < 0) {
    return false;
  }
  if (botStandingIndex > 1) {
    return false;
  }
  if (difficulty === "easy" && botStandingIndex > 0) {
    return false;
  }

  const currentLeader = standings[0];
  const botProjection = standings[botStandingIndex];
  if (
    botProjection &&
    currentLeader &&
    botProjection.playerId !== currentLeader.playerId &&
    botProjection.projectedTotal - currentLeader.projectedTotal > 4
  ) {
    return false;
  }

  return true;
}

function worstKnownSlot(
  state: GameState,
  botId: string,
  knowledge: BotKnowledge,
  difficulty: BotDifficulty,
): number {
  const player = findPlayer(state, botId);
  if (!player) {
    return 0;
  }

  let worstSlot = 0;
  let worstPoints = Number.NEGATIVE_INFINITY;
  for (let slot = 0; slot < player.hand.length; slot += 1) {
    if (!slotHasCard(player, slot)) {
      continue;
    }
    const pts = estimateSlotPoints(botId, botId, slot, knowledge, difficulty);
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
  difficulty: BotDifficulty,
): { playerId: string; slot: number } | null {
  let best: { playerId: string; slot: number; points: number } | null = null;

  for (const opponent of state.players) {
    if (opponent.id === botId || opponent.isWaiting) {
      continue;
    }
    if (!canTargetPlayer(opponent.id, state)) {
      continue;
    }

    for (let slot = 0; slot < opponent.hand.length; slot += 1) {
      if (!slotHasCard(opponent, slot)) {
        continue;
      }
      const pts = estimateSlotPoints(
        botId,
        opponent.id,
        slot,
        knowledge,
        difficulty,
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
  difficulty: BotDifficulty,
  preferOpponent: boolean,
): { playerId: string; slot: number } | null {
  if (preferOpponent) {
    const opponent = bestUnknownOpponentSlot(
      state,
      botId,
      knowledge,
      difficulty,
    );
    if (opponent) {
      return opponent;
    }
  }

  let best: { playerId: string; slot: number; points: number } | null = null;
  for (const player of state.players) {
    if (!canTargetPlayer(player.id, state) && player.id !== botId) {
      continue;
    }
    for (let slot = 0; slot < player.hand.length; slot += 1) {
      if (!slotHasCard(player, slot)) {
        continue;
      }
      if (knowledge.get(player.id, slot)) {
        continue;
      }
      const pts = estimateSlotPoints(
        botId,
        player.id,
        slot,
        knowledge,
        difficulty,
      );
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
  if (!bot) {
    return null;
  }
  for (let slot = 0; slot < bot.hand.length; slot += 1) {
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
  pointValues: CardPointValues,
): number {
  const known = knowledge.get(match.targetPlayerId, match.slot);
  const pts = known ? cardPoints(known, pointValues) : 8;
  if (match.targetPlayerId !== botId) {
    return pts + 10;
  }
  return pts;
}

function randomItem<T>(items: T[]): T | null {
  if (items.length === 0) {
    return null;
  }
  return items[Math.floor(Math.random() * items.length)] ?? null;
}

function findSnapTarget(
  state: GameState,
  botId: string,
  knowledge: BotKnowledge,
  difficulty: BotDifficulty,
): { targetPlayerId: string; slot: number } | null {
  if (state.discard.length === 0) {
    return null;
  }
  const top = state.discard[state.discard.length - 1];

  const matches: Array<{ targetPlayerId: string; slot: number }> = [];

  for (const player of state.players) {
    if (!canTargetPlayer(player.id, state) && player.id !== botId) {
      continue;
    }
    for (let slot = 0; slot < player.hand.length; slot += 1) {
      if (!slotHasCard(player, slot)) {
        continue;
      }
      const known = knowledge.get(player.id, slot);
      if (known && cardsSnapMatch(known, top)) {
        matches.push({ targetPlayerId: player.id, slot });
      }
    }
  }

  if (matches.length === 0) {
    return null;
  }

  if (difficulty === "easy") {
    const own = matches.filter((m) => m.targetPlayerId === botId);
    return randomItem(own);
  }

  if (isExpert(difficulty)) {
    return (
      [...matches].sort(
        (a, b) =>
          snapMatchScore(botId, b, knowledge, state.cardPoints) -
          snapMatchScore(botId, a, knowledge, state.cardPoints),
      )[0] ?? null
    );
  }

  const own = matches.find((m) => m.targetPlayerId === botId);
  if (own) {
    return own;
  }
  return matches[0] ?? null;
}

function decideAbility(
  state: GameState,
  botId: string,
  knowledge: BotKnowledge,
  difficulty: BotDifficulty,
): ClientMessage | null {
  const pending = state.pendingAbility;
  if (!pending || pending.playerId !== botId) {
    return null;
  }

  if (pending.kind === "snap_give") {
    const bot = findPlayer(state, botId);
    if (!bot) {
      return null;
    }
    const worst = worstKnownSlot(state, botId, knowledge, difficulty);
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
      if (!bot) {
        return null;
      }
      if (isExpert(difficulty)) {
        const expertSlot = firstUnknownOwnSlot(state, botId, knowledge);
        if (expertSlot !== null) {
          return { type: "ability_look", playerId: botId, slot: expertSlot };
        }
      }
      const unknown = bot.hand
        .map((_, handSlot) => handSlot)
        .filter(
          (handSlot) =>
            slotHasCard(bot, handSlot) &&
            knowledge.get(botId, handSlot) === undefined,
        );
      const lookSlot =
        randomItem(unknown) ??
        worstKnownSlot(state, botId, knowledge, difficulty);
      return { type: "ability_look", playerId: botId, slot: lookSlot };
    }

    if (pending.kind === "spy") {
      if (isSmart(difficulty)) {
        const target = bestUnknownOpponentSlot(
          state,
          botId,
          knowledge,
          difficulty,
        );
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
        if (opponent.id === botId || !canTargetPlayer(opponent.id, state)) {
          continue;
        }
        for (let slot = 0; slot < opponent.hand.length; slot += 1) {
          if (slotHasCard(opponent, slot)) {
            candidates.push({ playerId: opponent.id, slot });
          }
        }
      }
      const pick = randomItem(candidates);
      if (!pick) {
        return null;
      }
      return { type: "ability_look", playerId: pick.playerId, slot: pick.slot };
    }

    const lookTarget = isSmart(difficulty)
      ? bestLookTarget(
          state,
          botId,
          knowledge,
          difficulty,
          isExpert(difficulty),
        )
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
      if (!canTargetPlayer(player.id, state) && player.id !== botId) {
        continue;
      }
      for (let slot = 0; slot < player.hand.length; slot += 1) {
        if (slotHasCard(player, slot)) {
          lookTargets.push({ playerId: player.id, slot });
        }
      }
    }
    const pick = randomItem(lookTargets);
    if (!pick) {
      return null;
    }
    return { type: "ability_look", playerId: pick.playerId, slot: pick.slot };
  }

  if (
    pending.kind === "blind_switch" ||
    pending.kind === "queen_swap" ||
    pending.kind === "king_swap"
  ) {
    const bot = findPlayer(state, botId);
    if (!bot) {
      return null;
    }

    const ownSlots = bot.hand
      .map((_, slot) => slot)
      .filter((slot) => slotHasCard(bot, slot));

    if (isSmart(difficulty)) {
      const ownWorst = worstKnownSlot(state, botId, knowledge, difficulty);
      const target = bestUnknownOpponentSlot(
        state,
        botId,
        knowledge,
        difficulty,
      );
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
    if (!opponent) {
      return null;
    }
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
  if (!bot) {
    return null;
  }

  if (
    state.phase === "playing" &&
    !state.turnStarted &&
    !state.drawnCard &&
    !bot.hasCalledCambio &&
    shouldCallCambio(state, botId, knowledge, difficulty)
  ) {
    return { type: "call_cambio" };
  }

  if (!(state.drawnCard || state.pendingAbility)) {
    if (state.phase !== "playing" && state.phase !== "cambio_final") {
      return null;
    }

    if (isSmart(difficulty) && state.discard.length > 0) {
      const top = state.discard[state.discard.length - 1];
      const worst = worstKnownSlot(state, botId, knowledge, difficulty);
      const worstPts = estimateSlotPoints(
        botId,
        botId,
        worst,
        knowledge,
        difficulty,
      );
      const topPts = cardPoints(top, state.cardPoints);
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
    const drawnPts = cardPoints(state.drawnCard, state.cardPoints);
    const worst = worstKnownSlot(state, botId, knowledge, difficulty);
    const worstPts = estimateSlotPoints(
      botId,
      botId,
      worst,
      knowledge,
      difficulty,
    );

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
    const worst = worstKnownSlot(state, botId, knowledge, difficulty);
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
    if (actor?.isBot) {
      ids.push(actor.id);
    }
    return ids;
  }

  for (const bot of state.players) {
    if (canBotSnap(state, bot)) {
      ids.push(bot.id);
    }
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
  if (botThinkingId) {
    return null;
  }

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
  if (!bot?.isBot) {
    return null;
  }
  const difficulty = bot.botDifficulty ?? "easy";
  knowledge.prepareForState(state);

  if (state.phase === "setup_peek" && isPlayingPlayer(bot)) {
    const unpeeked = SETUP_PEEK_SLOTS.filter(
      (peekSlot) => !bot.setupPeekedSlots.includes(peekSlot),
    );
    const nextSetupSlot = unpeeked[0];
    if (nextSetupSlot !== undefined) {
      return { type: "setup_peek", slot: nextSetupSlot };
    }
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

export function forgetSnapTargetForAllBots(
  knowledgeMap: Map<string, BotKnowledge>,
  targetPlayerId: string,
  slot: number,
): void {
  for (const knowledge of knowledgeMap.values()) {
    knowledge.forget(targetPlayerId, slot);
  }
}

export function updateBotKnowledge(
  knowledge: BotKnowledge,
  state: GameState,
  botId: string,
  message: ClientMessage,
  result: {
    secretPeek?: { playerId: string; slot: number; card: unknown };
    error?: string;
    penaltyFlash?: { playerId: string; slot: number };
  },
): void {
  const bot = findPlayer(state, botId);
  if (!bot?.isBot) {
    return;
  }

  if (message.type === "snap" && result.error) {
    if (result.penaltyFlash || result.error === "No card in that slot.") {
      knowledge.forget(message.targetPlayerId, message.slot);
    }
    return;
  }

  if (message.type === "setup_peek") {
    const card = getHandCard(bot, message.slot);
    if (card) {
      knowledge.remember(botId, message.slot, card);
    }
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
    if (card) {
      knowledge.remember(botId, message.slot, card);
    }
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
  const config = BOT_DIFFICULTY_CONFIG[difficulty];
  let delay = randomInt(config.delayMinMs, config.delayMaxMs);
  if (Math.random() < config.hesitationChance) {
    delay += randomInt(config.hesitationMinMs, config.hesitationMaxMs);
  }
  return delay;
}
