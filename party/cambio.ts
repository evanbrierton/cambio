import type * as Party from "partykit/server";
import {
  buildPlayerView,
  createRoom,
  handleMessage,
} from "../src/game/engine";
import type { Card, ClientMessage, GameState, ServerMessage } from "../src/game/types";

function migrateState(state: GameState): GameState {
  return {
    ...state,
    roundNumber: state.roundNumber ?? 0,
    roundHistory: state.roundHistory ?? [],
    cumulativeScores: state.cumulativeScores ?? {},
    players: state.players.map((p) => ({
      ...p,
      isWaiting: p.isWaiting ?? false,
    })),
  };
}

export default class CambioParty implements Party.Server {
  state: GameState | null = null;

  constructor(readonly room: Party.Room) {}

  async onStart() {
    const saved = await this.room.storage.get<GameState>("state");
    if (saved) this.state = migrateState(saved);
  }

  async persist() {
    if (this.state) await this.room.storage.put("state", this.state);
  }

  getPlayerId(connection: Party.Connection): string | null {
    const id = (connection.state as { playerId?: string } | undefined)?.playerId;
    return id ?? null;
  }

  sendToPlayer(playerId: string, message: ServerMessage) {
    for (const conn of this.room.getConnections()) {
      if (this.getPlayerId(conn) === playerId) {
        conn.send(JSON.stringify(message));
      }
    }
  }

  broadcastState() {
    if (!this.state) return;
    for (const conn of this.room.getConnections()) {
      const playerId = this.getPlayerId(conn);
      if (!playerId) continue;
      const view = buildPlayerView(this.state, playerId);
      conn.send(JSON.stringify({ type: "state", view }));
    }
  }

  async onConnect(connection: Party.Connection, ctx: Party.ConnectionContext) {
    const url = new URL(ctx.request.url);
    const queryPlayerId = url.searchParams.get("playerId");
    const name = (url.searchParams.get("name") ?? "Player").slice(0, 24);

    let playerId = queryPlayerId ?? crypto.randomUUID().slice(0, 10);

    if (!this.state) {
      this.state = createRoom(this.room.id, name, queryPlayerId ?? undefined);
      playerId = this.state.hostId;
    } else if (queryPlayerId) {
      const existing = this.state.players.find((p) => p.id === queryPlayerId);
      if (existing) {
        // Same seat reconnecting (e.g. refresh) — reclaim id and drop stale socket.
        playerId = queryPlayerId;
        for (const conn of this.room.getConnections()) {
          if (conn.id !== connection.id && this.getPlayerId(conn) === queryPlayerId) {
            conn.close(1000, "reconnected");
          }
        }
      } else {
        // Stale localStorage from another room/session — join as a new player.
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
        roomId: this.room.id,
        playerId,
      }),
    );

    this.broadcastState();
  }

  async onClose(connection: Party.Connection) {
    const playerId = this.getPlayerId(connection);
    if (!this.state || !playerId) return;

    const stillConnected = [...this.room.getConnections()].some(
      (conn) => conn.id !== connection.id && this.getPlayerId(conn) === playerId,
    );
    if (stillConnected) return;

    const player = this.state.players.find((p) => p.id === playerId);
    if (player) {
      player.connected = false;
      await this.persist();
      this.broadcastState();
    }
  }

  async onMessage(raw: string | ArrayBuffer, sender: Party.Connection) {
    const playerId = this.getPlayerId(sender);
    if (!this.state || !playerId) return;

    let message: ClientMessage;
    try {
      message = JSON.parse(typeof raw === "string" ? raw : "") as ClientMessage;
    } catch {
      sender.send(JSON.stringify({ type: "error", message: "Invalid message." }));
      return;
    }

    const result = handleMessage(this.state, playerId, message);

    if (result.error) {
      sender.send(JSON.stringify({ type: "error", message: result.error }));
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
    this.broadcastState();
  }
}

CambioParty satisfies Party.Worker;
