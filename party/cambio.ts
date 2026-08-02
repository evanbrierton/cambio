import {
  type Connection,
  type ConnectionContext,
  Server,
  type WSMessage,
} from "partyserver";
import {
  BotKnowledge,
  botThinkDelay,
  collectActingBots,
  decideBotAction,
  updateBotKnowledge,
} from "../src/game/bot";
import { botChatDelay, pickBotChatMessage } from "../src/game/bot-chat";
import {
  addBotPlayer,
  addChatMessage,
  buildPlayerView,
  createRoom,
  expireSnapWindow,
  findPlayer,
  handleMessage,
} from "../src/game/engine";
import type {
  Card,
  ClientMessage,
  GameState,
  PeekFlash,
  ServerMessage,
  SwapFlashSlot,
} from "../src/game/types";
import {
  DEFAULT_BOT_COUNT,
  MAX_BOT_COUNT,
  MIN_BOT_COUNT,
  parseBotDifficulty,
} from "../src/game/types";

type PlayerConnectionState = { playerId?: string };

function migrateState(state: GameState): GameState {
  return {
    ...state,
    isSoloMode: state.isSoloMode ?? false,
    soloDifficulty: state.soloDifficulty ?? null,
    botThinkingId: null,
    roundNumber: state.roundNumber ?? 0,
    roundHistory: state.roundHistory ?? [],
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
    })),
  };
}

function messageText(raw: WSMessage): string {
  if (typeof raw === "string") return raw;
  if (raw instanceof ArrayBuffer) return new TextDecoder().decode(raw);
  return new TextDecoder().decode(raw);
}

export class CambioParty extends Server {
  state: GameState | null = null;
  private botKnowledge = new Map<string, BotKnowledge>();
  private botTimer: ReturnType<typeof setTimeout> | null = null;
  private botChatTimer: ReturnType<typeof setTimeout> | null = null;

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

  private scheduleBotChat() {
    if (this.botChatTimer) return;
    if (!this.state?.isSoloMode) return;

    const bots = this.state.players.filter((p) => p.isBot);
    if (bots.length === 0) return;

    const delay = botChatDelay();
    this.botChatTimer = setTimeout(() => {
      this.botChatTimer = null;
      void this.sendRandomBotChat();
    }, delay);
  }

  private async sendRandomBotChat() {
    if (!this.state?.isSoloMode) return;

    const bots = this.state.players.filter((p) => p.isBot);
    if (bots.length === 0) {
      this.scheduleBotChat();
      return;
    }

    const bot = bots[Math.floor(Math.random() * bots.length)];
    const text = pickBotChatMessage(bot.botDifficulty ?? "easy");
    const result = addChatMessage(this.state, bot.id, text, { fromBot: true });
    if (!("error" in result)) {
      await this.persist();
      this.broadcastState();
    }

    this.scheduleBotChat();
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

  private async dispatchMessage(
    playerId: string,
    message: ClientMessage,
    connection?: Connection<PlayerConnectionState>,
  ) {
    if (!this.state) return;

    const result = handleMessage(this.state, playerId, message);

    if (result.error && connection) {
      connection.send(JSON.stringify({ type: "error", message: result.error }));
    }

    this.applyMessageResult(playerId, message, result);

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
    if (result.peekFlash) {
      this.broadcastPeekFlash(result.peekFlash);
    }
    if (result.penaltyFlash) {
      this.broadcastPenaltyFlash(result.penaltyFlash);
    }
    if (result.cambioFlash) {
      this.broadcastCambioFlash(result.cambioFlash.playerId);
    }

    this.scheduleBotTurns();
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

  async onStart() {
    const saved = await this.ctx.storage.get<GameState>("state");
    if (saved) {
      this.state = migrateState(saved);
      await this.syncSnapWindow();
      this.scheduleBotTurns();
      this.scheduleBotChat();
    }
  }

  async persist() {
    if (this.state) {
      this.state.botThinkingId = null;
      await this.ctx.storage.put("state", this.state);
    }
  }

  async scheduleSnapWindowAlarm() {
    if (
      !this.state ||
      this.state.phase !== "snap_window" ||
      !this.state.snapWindowEndsAt
    ) {
      await this.ctx.storage.deleteAlarm();
      return;
    }
    await this.ctx.storage.setAlarm(this.state.snapWindowEndsAt);
  }

  async syncSnapWindow() {
    if (!this.state || this.state.phase !== "snap_window") return;
    if (expireSnapWindow(this.state)) {
      await this.persist();
      await this.ctx.storage.deleteAlarm();
      this.broadcastState();
      this.scheduleBotTurns();
      return;
    }
    await this.scheduleSnapWindowAlarm();
  }

  async onAlarm() {
    if (!this.state) return;
    if (expireSnapWindow(this.state)) {
      await this.persist();
      await this.ctx.storage.deleteAlarm();
      this.broadcastState();
      this.scheduleBotTurns();
      return;
    }
    await this.scheduleSnapWindowAlarm();
    this.broadcastState();
  }

  getPlayerId(connection: Connection<PlayerConnectionState>): string | null {
    return connection.state?.playerId ?? null;
  }

  sendToPlayer(playerId: string, message: ServerMessage) {
    for (const conn of this.getConnections<PlayerConnectionState>()) {
      if (this.getPlayerId(conn) === playerId) {
        conn.send(JSON.stringify(message));
      }
    }
  }

  broadcastState() {
    if (!this.state) return;
    for (const conn of this.getConnections<PlayerConnectionState>()) {
      const playerId = this.getPlayerId(conn);
      if (!playerId) continue;
      const view = buildPlayerView(this.state, playerId);
      conn.send(JSON.stringify({ type: "state", view }));
    }
  }

  broadcastSwapFlash(slots: SwapFlashSlot[]) {
    const message: ServerMessage = { type: "swap_flash", slots };
    const payload = JSON.stringify(message);
    for (const conn of this.getConnections()) {
      conn.send(payload);
    }
  }

  broadcastPeekFlash(peekFlash: PeekFlash) {
    const message: ServerMessage = {
      type: "peek_flash",
      kind: peekFlash.kind,
      actorId: peekFlash.actorId,
      playerId: peekFlash.playerId,
      slot: peekFlash.slot,
    };
    const payload = JSON.stringify(message);
    for (const conn of this.getConnections()) {
      conn.send(payload);
    }
  }

  broadcastPenaltyFlash(penaltyFlash: { playerId: string; slot: number }) {
    const message: ServerMessage = {
      type: "penalty_flash",
      playerId: penaltyFlash.playerId,
      slot: penaltyFlash.slot,
    };
    const payload = JSON.stringify(message);
    for (const conn of this.getConnections()) {
      conn.send(payload);
    }
  }

  broadcastCambioFlash(playerId: string) {
    const message: ServerMessage = { type: "cambio_flash", playerId };
    const payload = JSON.stringify(message);
    for (const conn of this.getConnections()) {
      conn.send(payload);
    }
  }

  async onConnect(
    connection: Connection<PlayerConnectionState>,
    ctx: ConnectionContext,
  ) {
    const url = new URL(ctx.request.url);
    const queryPlayerId = url.searchParams.get("playerId");
    const name = (url.searchParams.get("name") ?? "Player").slice(0, 24);
    const isSolo = url.searchParams.get("solo") === "1";
    const botCount = Math.min(
      MAX_BOT_COUNT,
      Math.max(
        MIN_BOT_COUNT,
        Number.parseInt(
          url.searchParams.get("bots") ?? String(DEFAULT_BOT_COUNT),
          10,
        ) || DEFAULT_BOT_COUNT,
      ),
    );
    const difficulty = parseBotDifficulty(url.searchParams.get("difficulty"));

    let playerId = queryPlayerId ?? crypto.randomUUID().slice(0, 10);

    if (!this.state) {
      this.state = createRoom(this.name, name, queryPlayerId ?? undefined);
      playerId = this.state.hostId;

      if (isSolo) {
        this.state.isSoloMode = true;
        this.state.soloDifficulty = difficulty;
        for (let i = 0; i < botCount; i++) {
          addBotPlayer(this.state, difficulty);
        }
      }
    } else if (queryPlayerId) {
      const existing = this.state.players.find((p) => p.id === queryPlayerId);
      if (existing) {
        playerId = queryPlayerId;
        for (const conn of this.getConnections<PlayerConnectionState>()) {
          if (
            conn.id !== connection.id &&
            this.getPlayerId(conn) === queryPlayerId
          ) {
            conn.close(1000, "reconnected");
          }
        }
      } else {
        playerId = crypto.randomUUID().slice(0, 10);
      }
    }

    connection.setState({ playerId });

    const result = handleMessage(this.state, playerId, {
      type: "join",
      playerId,
      name,
    });

    if (result.error) {
      connection.send(JSON.stringify({ type: "error", message: result.error }));
    }

    await this.persist();

    connection.send(
      JSON.stringify({
        type: "room_info",
        roomId: this.name,
        playerId,
      }),
    );

    await this.syncSnapWindow();
    this.broadcastState();
    this.scheduleBotTurns();
    this.scheduleBotChat();
  }

  async onClose(connection: Connection<PlayerConnectionState>) {
    const playerId = this.getPlayerId(connection);
    if (!this.state || !playerId) return;

    const stillConnected = [
      ...this.getConnections<PlayerConnectionState>(),
    ].some(
      (conn) =>
        conn.id !== connection.id && this.getPlayerId(conn) === playerId,
    );
    if (stillConnected) return;

    const player = this.state.players.find((p) => p.id === playerId);
    if (player) {
      player.connected = false;
      await this.persist();
      this.broadcastState();
    }
  }

  async onMessage(
    connection: Connection<PlayerConnectionState>,
    raw: WSMessage,
  ) {
    const playerId = this.getPlayerId(connection);
    if (!this.state || !playerId) return;

    this.clearBotTimer();

    let message: ClientMessage;
    try {
      message = JSON.parse(messageText(raw)) as ClientMessage;
    } catch {
      connection.send(
        JSON.stringify({ type: "error", message: "Invalid message." }),
      );
      return;
    }

    await this.dispatchMessage(playerId, message, connection);
  }
}
