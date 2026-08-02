import {
  type Connection,
  type ConnectionContext,
  Server,
  type WSMessage,
} from "partyserver";
import {
  buildPlayerView,
  createRoom,
  expireSnapWindow,
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

type PlayerConnectionState = { playerId?: string; debugEnabled?: boolean };

function migrateState(state: GameState): GameState {
  return {
    ...state,
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

  async onStart() {
    const saved = await this.ctx.storage.get<GameState>("state");
    if (saved) {
      this.state = migrateState(saved);
      await this.syncSnapWindow();
    }
  }

  async persist() {
    if (this.state) await this.ctx.storage.put("state", this.state);
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
    const name = (url.searchParams.get("name") ?? "").trim().slice(0, 24);
    const debugEnabled = url.searchParams.has("debug");

    const existingPlayer = queryPlayerId
      ? this.state?.players.find((p) => p.id === queryPlayerId)
      : undefined;

    if (!existingPlayer && !name) {
      connection.send(
        JSON.stringify({ type: "error", message: "Please enter a name." }),
      );
      connection.close(1008, "Name required");
      return;
    }

    let playerId = queryPlayerId ?? crypto.randomUUID().slice(0, 10);

    if (!this.state) {
      this.state = createRoom(this.name, name, queryPlayerId ?? undefined);
      playerId = this.state.hostId;
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

    connection.setState({ playerId, debugEnabled });

    const result = handleMessage(this.state, playerId, {
      type: "join",
      playerId,
      name,
    });

    if (result.error) {
      connection.send(JSON.stringify({ type: "error", message: result.error }));
      if (!this.state.players.some((p) => p.id === playerId)) {
        connection.close(1008, result.error);
        return;
      }
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

    let message: ClientMessage;
    try {
      message = JSON.parse(messageText(raw)) as ClientMessage;
    } catch {
      connection.send(
        JSON.stringify({ type: "error", message: "Invalid message." }),
      );
      return;
    }

    if (
      (message.type === "toggle_debug" || message.type === "restart_game") &&
      !connection.state?.debugEnabled
    ) {
      connection.send(
        JSON.stringify({
          type: "error",
          message: "Debug options are not enabled for this session.",
        }),
      );
      return;
    }

    const result = handleMessage(this.state, playerId, message);

    if (result.error) {
      connection.send(JSON.stringify({ type: "error", message: result.error }));
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

    if (result.peekFlash) {
      this.broadcastPeekFlash(result.peekFlash);
    }

    if (result.penaltyFlash) {
      this.broadcastPenaltyFlash(result.penaltyFlash);
    }

    if (result.cambioFlash) {
      this.broadcastCambioFlash(result.cambioFlash.playerId);
    }
  }
}
