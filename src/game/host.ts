import {
  MATCH_ABANDON_MS,
  MATCH_LOBBY_LEAVE_GRACE_MS,
  MATCH_SOFT_START_MS,
} from "../matchmaking/types";
import {
  BotKnowledge,
  botThinkDelay,
  collectActingBots,
  decideBotAction,
  forgetSnapTargetForAllBots,
  updateBotKnowledge,
} from "./bot";
import { botChatDelay, shouldFocusTarpingForChat } from "./bot-chat";
import {
  capturePreMoveSnapshot,
  detectMoveReaction,
  type GameMoveReaction,
  shouldReactToMove,
} from "./bot-chat-events";
import { generateBotChatMessage } from "./bot-chat-llm";
import {
  addBotPlayer,
  addChatMessage,
  buildPlayerView,
  createRoom,
  expireSnapWindow,
  findPlayer,
  handleMessage,
  migrateRoundHistory,
  purgeStaleMatchmadeLobbyPlayers,
  removeLobbyPlayer,
} from "./engine";
import type {
  BotDifficulty,
  Card,
  ClientMessage,
  GameState,
  PeekFlash,
  ServerMessage,
  SnapFlash,
  SwapFlashSlot,
} from "./types";
import {
  DEFAULT_BOT_COUNT,
  DEFAULT_CARD_POINTS,
  DEFAULT_JOKER_COUNT,
  MAX_BOT_COUNT,
  MIN_BOT_COUNT,
} from "./types";

export type HostPeer = {
  playerId: string;
  send: (message: ServerMessage) => void;
  connected: boolean;
};

export type GameHostConfig = {
  roomId: string;
  groqApiKey?: string;
  /** Called after state mutations that should be persisted. */
  onPersist?: () => void | Promise<void>;
  /** Called when snap window end time changes (null clears). */
  onSnapWindowSchedule?: (endsAt: number | null) => void | Promise<void>;
  /** Called when a matchmade lobby leaves lobby phase so Find Match stops seating into it. */
  onMatchLobbyClosed?: (roomId: string) => void | Promise<void>;
};

export type ConnectParams = {
  queryPlayerId: string | null;
  name: string;
  isSolo: boolean;
  botCount: number;
  difficulty: BotDifficulty;
  isMatchmade?: boolean;
  matchTargetSize?: number;
  matchFillWithBots?: boolean;
};

export type ConnectResult = {
  playerId: string;
  error?: string;
  closeConnection?: boolean;
};

const MOVE_REACTION_COOLDOWN_MS = 12_000;

export function migrateHostState(state: GameState): GameState {
  const migrated: GameState = {
    ...state,
    isSoloMode: state.isSoloMode ?? false,
    isMatchmade: state.isMatchmade ?? false,
    matchTargetSize: state.matchTargetSize ?? 4,
    matchFillWithBots: state.matchFillWithBots ?? true,
    matchSoftStartAt: state.matchSoftStartAt ?? null,
    soloDifficulty: state.soloDifficulty ?? null,
    jokerCount: state.jokerCount ?? DEFAULT_JOKER_COUNT,
    cardPoints: { ...DEFAULT_CARD_POINTS, ...state.cardPoints },
    botThinkingId: null,
    roundNumber: state.roundNumber ?? 0,
    roundHistory: migrateRoundHistory(state.roundHistory),
    cumulativeScores: state.cumulativeScores ?? {},
    snapWindowEndsAt: state.snapWindowEndsAt ?? null,
    snapEligibleTopCardId: state.snapEligibleTopCardId ?? null,
    snapChainPlayerId: state.snapChainPlayerId ?? null,
    chatMessages: state.chatMessages ?? [],
    players: state.players.map((p) => ({
      ...p,
      isWaiting: p.isWaiting ?? false,
      isBot: p.isBot ?? false,
      botDifficulty: p.botDifficulty ?? null,
      setupPeekedSlots: p.setupPeekedSlots ?? [],
    })),
  };
  purgeStaleMatchmadeLobbyPlayers(migrated);
  return migrated;
}

export class GameHost {
  state: GameState | null = null;
  private peers = new Map<string, HostPeer>();
  private botKnowledge = new Map<string, BotKnowledge>();
  private botTimer: ReturnType<typeof setTimeout> | null = null;
  private botChatTimer: ReturnType<typeof setTimeout> | null = null;
  private botChatReplyTimer: ReturnType<typeof setTimeout> | null = null;
  private snapWindowTimer: ReturnType<typeof setTimeout> | null = null;
  private matchSoftStartTimer: ReturnType<typeof setTimeout> | null = null;
  private matchAbandonTimer: ReturnType<typeof setTimeout> | null = null;
  /** Player ids that left a matchmade lobby; blocked from passive reconnect only. */
  private matchLobbyDepartedIds = new Set<string>();
  /** Grace timers so brief socket flaps (Strict Mode) don't drop lobby seats. */
  private matchLobbyLeaveTimers = new Map<
    string,
    ReturnType<typeof setTimeout>
  >();
  private humanSnapStreak = 0;
  private lastMoveReactionAt = 0;

  constructor(private readonly config: GameHostConfig) {}

  getState(): GameState | null {
    return this.state;
  }

  setState(state: GameState | null) {
    this.state = state ? migrateHostState(state) : null;
  }

  addPeer(peerId: string, peer: HostPeer) {
    this.peers.set(peerId, peer);
  }

  removePeer(peerId: string) {
    this.peers.delete(peerId);
  }

  getPeer(peerId: string): HostPeer | undefined {
    return this.peers.get(peerId);
  }

  peerIdsForPlayer(playerId: string): string[] {
    return [...this.peers.entries()]
      .filter(([, peer]) => peer.playerId === playerId)
      .map(([id]) => id);
  }

  playerHasOtherPeer(playerId: string, exceptPeerId: string): boolean {
    return [...this.peers.entries()].some(
      ([id, peer]) => id !== exceptPeerId && peer.playerId === playerId,
    );
  }

  closeStalePeers(exceptPeerId: string, playerId: string) {
    for (const [id, peer] of this.peers) {
      if (id !== exceptPeerId && peer.playerId === playerId) {
        peer.connected = false;
        this.peers.delete(id);
      }
    }
  }

  resolveReconnectPlayerId(queryPlayerId: string | null, name: string): string {
    if (!this.state) return queryPlayerId ?? crypto.randomUUID().slice(0, 10);

    const isMatchmadeLobby =
      this.state.isMatchmade && this.state.phase === "lobby";

    if (queryPlayerId) {
      const existing = this.state.players.find((p) => p.id === queryPlayerId);
      if (existing) {
        // Reclaim the same seat (including brief disconnect grace).
        return queryPlayerId;
      }
      // New matchmade join: keep the client id so onConnect/handleConnect agree.
      if (isMatchmadeLobby) return queryPlayerId;
    }

    if (isMatchmadeLobby) {
      return crypto.randomUUID().slice(0, 10);
    }

    const normalizedName = name.trim().toLowerCase();
    if (normalizedName) {
      const reclaimable = this.state.players.find(
        (p) =>
          !p.isBot &&
          !p.connected &&
          !p.isWaiting &&
          p.name.trim().toLowerCase() === normalizedName,
      );
      if (reclaimable) return reclaimable.id;
    }

    return crypto.randomUUID().slice(0, 10);
  }

  private isMatchLobbyBlocked(queryPlayerId: string | null): boolean {
    return Boolean(
      queryPlayerId && this.matchLobbyDepartedIds.has(queryPlayerId),
    );
  }

  async handleConnect(params: ConnectParams): Promise<ConnectResult> {
    const {
      queryPlayerId,
      name,
      isSolo,
      botCount,
      difficulty,
      isMatchmade,
      matchTargetSize,
      matchFillWithBots,
    } = params;

    const existingPlayer = queryPlayerId
      ? this.state?.players.find((p) => p.id === queryPlayerId)
      : undefined;

    if (!existingPlayer && !name) {
      return {
        playerId: queryPlayerId ?? "",
        error: "Please enter a name.",
        closeConnection: true,
      };
    }

    let playerId = queryPlayerId ?? crypto.randomUUID().slice(0, 10);

    if (!this.state) {
      this.state = createRoom(
        this.config.roomId,
        name,
        queryPlayerId ?? undefined,
      );
      playerId = this.state.hostId;

      if (isSolo) {
        this.state.isSoloMode = true;
        this.state.soloDifficulty = difficulty;
        for (let i = 0; i < botCount; i++) {
          addBotPlayer(this.state, difficulty);
        }
      } else if (isMatchmade) {
        this.state.isMatchmade = true;
        this.state.matchTargetSize = matchTargetSize ?? 4;
        this.state.matchFillWithBots = matchFillWithBots ?? true;
      }
    } else {
      // Fresh Find Match must not land in a game that already started.
      if (
        isMatchmade &&
        this.state.isMatchmade &&
        this.state.phase !== "lobby" &&
        !existingPlayer
      ) {
        return {
          playerId: queryPlayerId ?? "",
          error: "This match already started. Find a new match.",
          closeConnection: true,
        };
      }
      // Fresh Find Match (match=1) may reassign the same room — allow re-entry.
      if (isMatchmade && queryPlayerId) {
        this.matchLobbyDepartedIds.delete(queryPlayerId);
      }
      if (
        this.state.isMatchmade &&
        this.state.phase === "lobby" &&
        !isMatchmade &&
        this.isMatchLobbyBlocked(queryPlayerId)
      ) {
        return {
          playerId: queryPlayerId ?? "",
          error: "You left the match lobby.",
          closeConnection: true,
        };
      }
      playerId = this.resolveReconnectPlayerId(queryPlayerId, name);
      this.clearMatchLobbyLeaveTimer(playerId);
    }

    const result = handleMessage(this.state, playerId, {
      type: "join",
      playerId,
      name,
    });

    if (result.error) {
      const closeConnection = !this.state.players.some(
        (p) => p.id === playerId,
      );
      return { playerId, error: result.error, closeConnection };
    }

    await this.persist();
    await this.syncSnapWindow();
    this.broadcastState();
    this.scheduleBotTurns();
    this.scheduleBotChat();
    await this.maybeAutoStartMatchmade();

    return { playerId };
  }

  async handleDisconnect(playerId: string, peerId: string) {
    if (!this.state) return;

    const isMatchmadeLobby =
      this.state.isMatchmade && this.state.phase === "lobby";

    if (!isMatchmadeLobby && this.playerHasOtherPeer(playerId, peerId)) return;

    this.clearBotChatTimer();
    this.clearBotChatReplyTimer();

    const player = this.state.players.find((p) => p.id === playerId);
    if (!player) return;

    if (isMatchmadeLobby && !player.isBot) {
      if (this.playerHasOtherPeer(playerId, peerId)) return;

      player.connected = false;
      const closingPeer = this.peers.get(peerId);
      if (closingPeer) closingPeer.connected = false;
      await this.persist();
      this.broadcastState();

      this.clearMatchLobbyLeaveTimer(playerId);
      const timer = setTimeout(() => {
        void this.finalizeMatchLobbyLeave(playerId);
      }, MATCH_LOBBY_LEAVE_GRACE_MS);
      this.matchLobbyLeaveTimers.set(playerId, timer);
      return;
    }

    player.connected = false;
    await this.persist();

    if (this.playerHasOtherPeer(playerId, peerId)) {
      player.connected = true;
      await this.persist();
      return;
    }

    this.broadcastState();
    await this.maybeAutoStartMatchmade();
  }

  private clearMatchLobbyLeaveTimer(playerId: string) {
    const timer = this.matchLobbyLeaveTimers.get(playerId);
    if (!timer) return;
    clearTimeout(timer);
    this.matchLobbyLeaveTimers.delete(playerId);
  }

  private async finalizeMatchLobbyLeave(playerId: string) {
    this.matchLobbyLeaveTimers.delete(playerId);
    if (!this.state?.isMatchmade || this.state.phase !== "lobby") return;

    // A newer live socket for this player won the race — keep the seat.
    for (const peer of this.peers.values()) {
      if (peer.playerId === playerId && peer.connected) return;
    }

    const player = this.state.players.find((entry) => entry.id === playerId);
    if (!player || player.connected || player.isBot) return;

    this.matchLobbyDepartedIds.add(playerId);
    removeLobbyPlayer(this.state, playerId);

    for (const [id, peer] of this.peers) {
      if (peer.playerId === playerId) {
        peer.connected = false;
        this.peers.delete(id);
      }
    }

    if (this.countMatchHumans() < 2 && this.state.matchSoftStartAt) {
      this.state.matchSoftStartAt = null;
      this.clearMatchSoftStartTimer();
    }

    await this.persist();
    this.broadcastState();
    await this.maybeAutoStartMatchmade();
  }

  private countMatchHumans(): number {
    if (!this.state) return 0;
    return this.state.players.filter(
      (player) => !player.isBot && !player.isWaiting && player.connected,
    ).length;
  }

  private clearMatchSoftStartTimer() {
    if (this.matchSoftStartTimer) {
      clearTimeout(this.matchSoftStartTimer);
      this.matchSoftStartTimer = null;
    }
  }

  private clearMatchAbandonTimer() {
    if (this.matchAbandonTimer) {
      clearTimeout(this.matchAbandonTimer);
      this.matchAbandonTimer = null;
    }
  }

  private clearMatchTimers() {
    this.clearMatchSoftStartTimer();
    this.clearMatchAbandonTimer();
  }

  private scheduleMatchSoftStart() {
    this.clearMatchSoftStartTimer();
    if (!this.state?.matchSoftStartAt) return;
    const delay = Math.max(0, this.state.matchSoftStartAt - Date.now());
    this.matchSoftStartTimer = setTimeout(() => {
      void this.onMatchSoftStart();
    }, delay);
  }

  private scheduleMatchAbandon() {
    this.clearMatchAbandonTimer();
    this.matchAbandonTimer = setTimeout(() => {
      void this.onMatchAbandon();
    }, MATCH_ABANDON_MS);
  }

  private async onMatchSoftStart() {
    if (!this.state?.isMatchmade || this.state.phase !== "lobby") return;
    if (this.countMatchHumans() >= 2) {
      await this.startMatchmadeGame();
    }
  }

  private async onMatchAbandon() {
    if (!this.state?.isMatchmade || this.state.phase !== "lobby") return;
    if (this.countMatchHumans() !== 1 || this.state.matchFillWithBots) return;
    addChatMessage(
      this.state,
      "system",
      "Match abandoned — not enough players joined.",
    );
    this.state.matchSoftStartAt = null;
    this.clearMatchTimers();
    await this.persist();
    this.broadcastState();
  }

  private async startMatchmadeGame() {
    if (!this.state?.isMatchmade || this.state.phase !== "lobby") return;

    const target = this.state.matchTargetSize;
    if (this.state.matchFillWithBots) {
      const difficulty: BotDifficulty = "medium";
      while (
        this.state.players.filter((player) => !player.isWaiting).length <
          target &&
        this.state.players.length < 6
      ) {
        addBotPlayer(this.state, difficulty);
      }
    }

    this.state.matchSoftStartAt = null;
    this.clearMatchTimers();
    await this.dispatchMessage(this.state.hostId, { type: "start_game" });
    if (this.state.phase !== "lobby") {
      await this.config.onMatchLobbyClosed?.(this.config.roomId);
    }
  }

  private async maybeAutoStartMatchmade() {
    if (!this.state?.isMatchmade || this.state.phase !== "lobby") return;

    const humans = this.countMatchHumans();
    const target = this.state.matchTargetSize;

    if (humans >= target) {
      this.clearMatchTimers();
      await this.startMatchmadeGame();
      return;
    }

    if (humans >= 2 && !this.state.matchSoftStartAt) {
      this.state.matchSoftStartAt = Date.now() + MATCH_SOFT_START_MS;
      await this.persist();
      this.scheduleMatchSoftStart();
    } else if (humans < 2 && this.state.matchSoftStartAt) {
      this.state.matchSoftStartAt = null;
      this.clearMatchSoftStartTimer();
      await this.persist();
    }

    if (humans === 1 && !this.state.matchFillWithBots) {
      this.scheduleMatchAbandon();
    } else {
      this.clearMatchAbandonTimer();
    }
  }

  clearBotTimerOnMessage() {
    this.clearBotTimer();
  }

  async dispatchMessage(
    playerId: string,
    message: ClientMessage,
    sendError?: (error: string) => void,
  ) {
    if (!this.state) return;

    const actor = findPlayer(this.state, playerId);
    const isHuman = actor !== undefined && !actor.isBot;
    const snapshot =
      isHuman && actor
        ? capturePreMoveSnapshot(this.state, playerId, message)
        : null;

    const result = handleMessage(this.state, playerId, message);

    if (result.error && sendError) {
      sendError(result.error);
    }

    this.applyMessageResult(playerId, message, result);

    if (
      message.type === "snap" &&
      !result.error &&
      "targetPlayerId" in message &&
      "slot" in message
    ) {
      forgetSnapTargetForAllBots(
        this.botKnowledge,
        message.targetPlayerId,
        message.slot,
      );
    }

    if (result.secretPeek) {
      this.sendToPlayer(playerId, {
        type: "secret_peek",
        playerId: result.secretPeek.playerId,
        slot: result.secretPeek.slot,
        card: result.secretPeek.card as Card,
      });
    }

    await this.persist();
    await this.syncSnapWindow();
    this.broadcastState();

    if (result.swapFlash) {
      this.broadcastSwapFlash(result.swapFlash.slots);
    }
    if (result.snapFlash) {
      this.broadcastSnapFlash(result.snapFlash);
    }
    if (result.peekFlash) {
      this.broadcastPeekFlash(result.peekFlash);
    }
    if (result.penaltyFlash) {
      this.broadcastPenaltyFlash(result.penaltyFlash);
    }
    if (result.cambioFlash) {
      this.broadcastCambioFlash(result.cambioFlash.playerId);
    }
    if (result.reshuffleFlash) {
      this.broadcastReshuffleFlash();
    }
    if (result.discardDrawFlash) {
      this.broadcastDiscardDrawFlash(result.discardDrawFlash.playerId);
    }
    if (result.deckDrawFlash) {
      this.broadcastDeckDrawFlash(result.deckDrawFlash.playerId);
    }

    if (message.type === "chat" && !result.error) {
      const player = findPlayer(this.state, playerId);
      if (player && !player.isBot) {
        this.scheduleBotChatReply(player.name, message.text);
      }
    }

    if (isHuman && actor && !result.error) {
      if (message.type === "start_game" || message.type === "restart_game") {
        this.humanSnapStreak = 0;
      }

      if (message.type === "snap") {
        if (result.penaltyFlash) {
          this.humanSnapStreak = 0;
        } else {
          this.humanSnapStreak += 1;
        }
      }

      const moveReaction = detectMoveReaction(
        this.state,
        actor,
        message,
        result,
        snapshot,
        this.humanSnapStreak,
      );
      if (moveReaction && shouldReactToMove(moveReaction)) {
        this.scheduleBotMoveReaction(moveReaction);
      }
    }

    this.scheduleBotTurns();
  }

  async onSnapWindowAlarm() {
    if (!this.state) return;
    if (expireSnapWindow(this.state)) {
      this.clearSnapWindowTimer();
      await this.config.onSnapWindowSchedule?.(null);
      await this.persist();
      this.broadcastState();
      this.scheduleBotTurns();
      return;
    }
    await this.syncSnapWindow();
    this.broadcastState();
  }

  async syncSnapWindow() {
    if (this.state?.phase !== "snap_window") {
      this.clearSnapWindowTimer();
      await this.config.onSnapWindowSchedule?.(null);
      return;
    }
    if (expireSnapWindow(this.state)) {
      this.clearSnapWindowTimer();
      await this.config.onSnapWindowSchedule?.(null);
      await this.persist();
      this.broadcastState();
      this.scheduleBotTurns();
      return;
    }
    await this.scheduleSnapWindowTimer();
  }

  async restoreFromSaved(saved: GameState) {
    this.state = migrateHostState(saved);
    await this.persist();
    await this.syncSnapWindow();
    this.scheduleBotTurns();
    this.scheduleBotChat();
    if (this.state?.matchSoftStartAt) {
      this.scheduleMatchSoftStart();
    }
    await this.maybeAutoStartMatchmade();
    if (this.state?.isMatchmade && this.state.phase !== "lobby") {
      await this.config.onMatchLobbyClosed?.(this.config.roomId);
    }
  }

  sendToPlayer(playerId: string, message: ServerMessage) {
    for (const peer of this.peers.values()) {
      if (peer.playerId === playerId && peer.connected) {
        peer.send(message);
      }
    }
  }

  broadcastState() {
    if (!this.state) return;
    for (const peer of this.peers.values()) {
      if (!peer.connected) continue;
      const view = buildPlayerView(this.state, peer.playerId);
      peer.send({ type: "state", view });
    }
  }

  broadcastToAll(message: ServerMessage) {
    for (const peer of this.peers.values()) {
      if (peer.connected) peer.send(message);
    }
  }

  broadcastSwapFlash(slots: SwapFlashSlot[]) {
    this.broadcastToAll({ type: "swap_flash", slots });
  }

  broadcastSnapFlash(snapFlash: SnapFlash) {
    this.broadcastToAll({
      type: "snap_flash",
      actorId: snapFlash.actorId,
      playerId: snapFlash.playerId,
      slot: snapFlash.slot,
    });
  }

  broadcastPeekFlash(peekFlash: PeekFlash) {
    this.broadcastToAll({
      type: "peek_flash",
      kind: peekFlash.kind,
      actorId: peekFlash.actorId,
      playerId: peekFlash.playerId,
      slot: peekFlash.slot,
    });
  }

  broadcastPenaltyFlash(penaltyFlash: { playerId: string; slot: number }) {
    this.broadcastToAll({
      type: "penalty_flash",
      playerId: penaltyFlash.playerId,
      slot: penaltyFlash.slot,
    });
  }

  broadcastCambioFlash(playerId: string) {
    this.broadcastToAll({ type: "cambio_flash", playerId });
  }

  broadcastReshuffleFlash() {
    this.broadcastToAll({ type: "reshuffle_flash" });
  }

  broadcastDiscardDrawFlash(playerId: string) {
    this.broadcastToAll({ type: "discard_draw_flash", playerId });
  }

  broadcastDeckDrawFlash(playerId: string) {
    this.broadcastToAll({ type: "deck_draw_flash", playerId });
  }

  private getBotKnowledge(botId: string): BotKnowledge {
    let knowledge = this.botKnowledge.get(botId);
    if (!knowledge) {
      knowledge = new BotKnowledge();
      this.botKnowledge.set(botId, knowledge);
    }
    return knowledge;
  }

  private clearBotTimer() {
    if (this.botTimer) {
      clearTimeout(this.botTimer);
      this.botTimer = null;
    }
    if (this.state) {
      this.state.botThinkingId = null;
    }
  }

  private clearBotChatTimer() {
    if (this.botChatTimer) {
      clearTimeout(this.botChatTimer);
      this.botChatTimer = null;
    }
  }

  private clearBotChatReplyTimer() {
    if (this.botChatReplyTimer) {
      clearTimeout(this.botChatReplyTimer);
      this.botChatReplyTimer = null;
    }
  }

  private clearSnapWindowTimer() {
    if (this.snapWindowTimer) {
      clearTimeout(this.snapWindowTimer);
      this.snapWindowTimer = null;
    }
  }

  private async scheduleSnapWindowTimer() {
    this.clearSnapWindowTimer();
    const endsAt = this.state?.snapWindowEndsAt;
    if (this.state?.phase !== "snap_window" || endsAt == null) {
      await this.config.onSnapWindowSchedule?.(null);
      return;
    }
    await this.config.onSnapWindowSchedule?.(endsAt);
    const delay = Math.max(0, endsAt - Date.now());
    this.snapWindowTimer = setTimeout(() => {
      this.snapWindowTimer = null;
      void this.onSnapWindowAlarm();
    }, delay);
  }

  private scheduleBotChat() {
    if (this.botChatTimer) return;
    if (!this.state?.isSoloMode) return;

    const bots = this.state.players.filter((p) => p.isBot);
    if (bots.length === 0) return;

    const delay = botChatDelay();
    this.botChatTimer = setTimeout(() => {
      this.botChatTimer = null;
      void this.sendBotChat();
    }, delay);
  }

  private scheduleBotChatReply(playerName: string, text: string) {
    if (!this.state?.isSoloMode) return;

    this.clearBotChatReplyTimer();
    const delay = 2_000 + Math.floor(Math.random() * 3_000);
    this.botChatReplyTimer = setTimeout(() => {
      this.botChatReplyTimer = null;
      void this.sendBotChat({ replyTo: { playerName, text } });
    }, delay);
  }

  private scheduleBotMoveReaction(reaction: GameMoveReaction) {
    if (!this.state?.isSoloMode) return;

    const now = Date.now();
    if (now - this.lastMoveReactionAt < MOVE_REACTION_COOLDOWN_MS) return;

    this.clearBotChatReplyTimer();
    this.lastMoveReactionAt = now;
    const delay = 1_500 + Math.floor(Math.random() * 2_500);
    this.botChatReplyTimer = setTimeout(() => {
      this.botChatReplyTimer = null;
      void this.sendBotChat({ gameMove: reaction });
    }, delay);
  }

  private async sendBotChat(options?: {
    replyTo?: { playerName: string; text: string };
    gameMove?: GameMoveReaction;
  }) {
    if (!this.state?.isSoloMode) return;

    const bots = this.state.players.filter((p) => p.isBot);
    if (bots.length === 0) {
      if (!options?.replyTo) this.scheduleBotChat();
      return;
    }

    const bot = bots[Math.floor(Math.random() * bots.length)];
    const botIds = new Set(bots.map((entry) => entry.id));
    const humanChatTexts = this.state.chatMessages
      .slice(-12)
      .filter((message) => !botIds.has(message.playerId))
      .map((message) => message.text);
    const focusTarping = options?.gameMove
      ? false
      : shouldFocusTarpingForChat({
          replyText: options?.replyTo?.text,
          humanChatTexts,
        });
    const result = await generateBotChatMessage(this.config.groqApiKey, {
      difficulty: bot.botDifficulty ?? "easy",
      botName: bot.name,
      playerNames: this.state.players.map((player) => player.name),
      recentChat: this.state.chatMessages.slice(-12),
      gamePhase: this.state.phase,
      roundNumber: this.state.roundNumber,
      replyTo: options?.replyTo,
      gameMove: options?.gameMove,
      focusTarping,
    });

    if (result.source === "template" && result.fallbackReason) {
      console.log(
        `[bot-chat] template fallback (${result.fallbackReason}) for ${bot.name}`,
      );
    }

    const posted = addChatMessage(this.state, bot.id, result.text, {
      fromBot: true,
    });
    if (!("error" in posted)) {
      await this.persist();
      this.broadcastState();
    }

    if (!options?.replyTo && !options?.gameMove) this.scheduleBotChat();
  }

  private applyMessageResult(
    botId: string,
    message: ClientMessage,
    result: ReturnType<typeof handleMessage>,
  ) {
    if (!this.state) return;
    const bot = findPlayer(this.state, botId);
    if (bot?.isBot) {
      updateBotKnowledge(
        this.getBotKnowledge(botId),
        this.state,
        botId,
        message,
        result,
      );
    }
  }

  scheduleBotTurns() {
    this.clearBotTimer();
    if (!this.state) return;

    let scheduledBotId: string | null = null;
    let scheduledAction: ClientMessage | null = null;

    for (const botId of collectActingBots(this.state)) {
      const bot = findPlayer(this.state, botId);
      if (!bot?.isBot) continue;
      const action = decideBotAction(
        this.state,
        botId,
        this.getBotKnowledge(botId),
      );
      if (action) {
        scheduledBotId = botId;
        scheduledAction = action;
        break;
      }
    }

    if (!scheduledBotId || !scheduledAction) return;

    const bot = findPlayer(this.state, scheduledBotId);
    if (!bot?.isBot) return;

    this.state.botThinkingId = scheduledBotId;
    this.broadcastState();

    const delay = botThinkDelay(bot.botDifficulty ?? "easy");
    this.botTimer = setTimeout(() => {
      this.botTimer = null;
      if (!this.state) return;
      this.state.botThinkingId = null;
      void this.dispatchMessage(scheduledBotId, scheduledAction);
    }, delay);
  }

  private async persist() {
    if (this.state) {
      this.state.botThinkingId = null;
      await this.config.onPersist?.();
    }
  }
}

export function clampBotCount(raw: number): number {
  return Math.min(
    MAX_BOT_COUNT,
    Math.max(MIN_BOT_COUNT, Number.isFinite(raw) ? raw : DEFAULT_BOT_COUNT),
  );
}
