import {
  type Connection,
  type ConnectionContext,
  Server,
  type WSMessage,
} from "partyserver";
import { clampBotCount, GameHost, type HostPeer } from "../src/game/host";
import type { GameState, ServerMessage } from "../src/game/types";
import { DEFAULT_BOT_COUNT, parseBotDifficulty } from "../src/game/types";
import { parseClientMessageJson } from "../src/game/wire-schema";
import { MATCHMAKING_ROOM_ID } from "../src/matchmaking/types";

type PlayerConnectionState = { playerId?: string; debugEnabled?: boolean };

function messageText(raw: WSMessage): string {
  if (typeof raw === "string") return raw;
  if (raw instanceof ArrayBuffer) return new TextDecoder().decode(raw);
  return new TextDecoder().decode(raw);
}

export class CambioParty extends Server<Env> {
  private host: GameHost;

  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env);
    this.host = new GameHost({
      roomId: this.name,
      groqApiKey: this.env.GROQ_API_KEY,
      onPersist: () => this.persist(),
      onSnapWindowSchedule: (endsAt) => this.scheduleSnapWindowAlarm(endsAt),
      onMatchLobbyClosed: (roomId) => this.closeMatchmakingLobby(roomId),
      onMatchLobbyPlayerLeft: (roomId, playerId) =>
        this.leaveMatchmakingLobby(roomId, playerId),
    });
  }

  private async closeMatchmakingLobby(roomId: string) {
    try {
      const id = this.env.Matchmaking.idFromName(MATCHMAKING_ROOM_ID);
      const stub = this.env.Matchmaking.get(id);
      await stub.fetch("https://matchmaking/close-lobby", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ roomId }),
      });
    } catch {
      // Best-effort: Find Match may briefly reuse a started room until next close.
    }
  }

  private async leaveMatchmakingLobby(roomId: string, playerId: string) {
    try {
      const id = this.env.Matchmaking.idFromName(MATCHMAKING_ROOM_ID);
      const stub = this.env.Matchmaking.get(id);
      await stub.fetch("https://matchmaking/leave-lobby", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ roomId, playerId }),
      });
    } catch {
      // Best-effort: leaver may briefly be reseated until the next leave/close.
    }
  }

  get state(): GameState | null {
    return this.host.getState();
  }

  set state(value: GameState | null) {
    this.host.setState(value);
  }

  async onStart() {
    const saved = await this.ctx.storage.get<GameState>("state");
    if (saved) {
      await this.host.restoreFromSaved(saved);
    }
    this.rehydratePeers();
    await this.host.removeUnbackedMatchLobbyHumans();
  }

  /** Re-attach hibernated sockets so leftover-host cleanup does not drop them. */
  private rehydratePeers() {
    for (const connection of this.getConnections<PlayerConnectionState>()) {
      if (this.host.getPeer(connection.id)) continue;
      this.registerConnection(connection);
    }
  }

  async persist() {
    const state = this.host.getState();
    if (state) {
      await this.ctx.storage.put("state", state);
    } else {
      await this.ctx.storage.delete("state");
    }
  }

  async scheduleSnapWindowAlarm(endsAt: number | null) {
    if (endsAt == null) {
      await this.ctx.storage.deleteAlarm();
      return;
    }
    await this.ctx.storage.setAlarm(endsAt);
  }

  async onAlarm() {
    await this.host.onSnapWindowAlarm();
  }

  private registerConnection(
    connection: Connection<PlayerConnectionState>,
  ): HostPeer {
    const send = (message: ServerMessage) => {
      connection.send(JSON.stringify(message));
    };
    const peer: HostPeer = {
      playerId: connection.state?.playerId ?? "",
      send,
      connected: true,
    };
    this.host.addPeer(connection.id, peer);
    return peer;
  }

  private syncPeerPlayerId(
    connection: Connection<PlayerConnectionState>,
    playerId: string,
  ) {
    const peer = this.host.getPeer(connection.id);
    if (peer) peer.playerId = playerId;
  }

  getPlayerId(connection: Connection<PlayerConnectionState>): string | null {
    return connection.state?.playerId ?? null;
  }

  async onConnect(
    connection: Connection<PlayerConnectionState>,
    ctx: ConnectionContext,
  ) {
    this.rehydratePeers();
    const url = new URL(ctx.request.url);
    const queryPlayerId = url.searchParams.get("playerId");
    const name = (url.searchParams.get("name") ?? "").trim().slice(0, 24);
    const debugEnabled = url.searchParams.has("debug");
    const isSolo = url.searchParams.get("solo") === "1";
    const isMatchmade = url.searchParams.get("match") === "1";
    const matchTargetSize = Number.parseInt(
      url.searchParams.get("targetSize") ?? "4",
      10,
    );
    const matchFillWithBots = url.searchParams.get("fillWithBots") !== "0";
    const botCount = clampBotCount(
      Number.parseInt(
        url.searchParams.get("bots") ?? String(DEFAULT_BOT_COUNT),
        10,
      ) || DEFAULT_BOT_COUNT,
    );
    const difficulty = parseBotDifficulty(url.searchParams.get("difficulty"));

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

    if (this.state) {
      playerId = this.host.resolveReconnectPlayerId(queryPlayerId, name);
      connection.setState({ playerId, debugEnabled });
      this.host.closeStalePeers(connection.id, playerId);
      for (const staleId of this.host.peerIdsForPlayer(playerId)) {
        if (staleId !== connection.id) {
          for (const staleConn of this.getConnections<PlayerConnectionState>()) {
            if (staleConn.id === staleId) {
              staleConn.close(1000, "reconnected");
            }
          }
        }
      }
    }

    connection.setState({ playerId, debugEnabled });
    this.registerConnection(connection);
    this.syncPeerPlayerId(connection, playerId);

    const result = await this.host.handleConnect({
      queryPlayerId: playerId,
      name,
      isSolo,
      botCount,
      difficulty,
      isMatchmade,
      matchTargetSize,
      matchFillWithBots,
    });

    if (result.error) {
      connection.send(JSON.stringify({ type: "error", message: result.error }));
      if (result.closeConnection) {
        connection.close(1008, result.error);
        this.host.removePeer(connection.id);
        return;
      }
    }

    this.syncPeerPlayerId(connection, result.playerId);
    connection.setState({ playerId: result.playerId, debugEnabled });

    connection.send(
      JSON.stringify({
        type: "room_info",
        roomId: this.name,
        playerId: result.playerId,
      }),
    );
  }

  async onClose(connection: Connection<PlayerConnectionState>) {
    const playerId = this.getPlayerId(connection);
    if (!playerId) return;

    const peer = this.host.getPeer(connection.id);
    if (peer) peer.connected = false;

    await this.host.handleDisconnect(playerId, connection.id);
    this.host.removePeer(connection.id);
  }

  async onMessage(
    connection: Connection<PlayerConnectionState>,
    raw: WSMessage,
  ) {
    const playerId = this.getPlayerId(connection);
    if (!this.state || !playerId) return;

    this.host.clearBotTimerOnMessage();

    const message = parseClientMessageJson(messageText(raw));
    if (!message) {
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

    await this.host.dispatchMessage(playerId, message, (error) => {
      connection.send(JSON.stringify({ type: "error", message: error }));
    });
  }
}
