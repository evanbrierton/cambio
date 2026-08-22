import {
  type Connection,
  type ConnectionContext,
  Server,
  type WSMessage,
} from "partyserver";
import { clampSeedBotCount, GameHost, type HostPeer } from "../src/game/host";
import type { GameState, ServerMessage } from "../src/game/types";
import {
  DEFAULT_BOT_COUNT,
  parseBotDifficulty,
  parseLobbyNetwork,
  parseLobbyVisibility,
} from "../src/game/types";
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
      onPublicLobbyListed: (info) => this.listMatchmakingLobby(info),
      onPublicLobbySeatsChanged: (info) =>
        this.updateMatchmakingLobbySeats(info),
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
      // Best-effort: Find Public may briefly reuse a started room until next close.
    }
  }

  private async listMatchmakingLobby(info: {
    roomId: string;
    targetSize: number;
    fillWithBots: boolean;
    humanCount: number;
    botCount: number;
  }) {
    try {
      const id = this.env.Matchmaking.idFromName(MATCHMAKING_ROOM_ID);
      const stub = this.env.Matchmaking.get(id);
      await stub.fetch("https://matchmaking/list-lobby", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(info),
      });
    } catch {
      // Best-effort listing.
    }
  }

  private async updateMatchmakingLobbySeats(info: {
    roomId: string;
    targetSize: number;
    fillWithBots: boolean;
    humanCount: number;
    botCount: number;
  }) {
    try {
      const id = this.env.Matchmaking.idFromName(MATCHMAKING_ROOM_ID);
      const stub = this.env.Matchmaking.get(id);
      await stub.fetch("https://matchmaking/update-lobby-seats", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          roomId: info.roomId,
          humanCount: info.humanCount,
          botCount: info.botCount,
        }),
      });
    } catch {
      // Best-effort seat sync.
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
    const url = new URL(ctx.request.url);
    const queryPlayerId = url.searchParams.get("playerId");
    const name = (url.searchParams.get("name") ?? "").trim().slice(0, 24);
    const debugEnabled = url.searchParams.has("debug");
    const network = parseLobbyNetwork(
      url.searchParams.get("network") ??
        (url.searchParams.get("mode") === "local" ? "nearby" : null),
    );
    const visibilityFromQuery = parseLobbyVisibility(
      url.searchParams.get("visibility"),
    );
    const isLegacySolo = url.searchParams.get("solo") === "1";
    const isPublic =
      url.searchParams.get("match") === "1" || visibilityFromQuery === "public";
    const matchTargetSize = Number.parseInt(
      url.searchParams.get("targetSize") ?? "4",
      10,
    );
    const matchFillWithBots = url.searchParams.get("fillWithBots") !== "0";
    const seedBotCount = clampSeedBotCount(
      Number.parseInt(
        url.searchParams.get("bots") ??
          (isLegacySolo ? String(DEFAULT_BOT_COUNT) : "0"),
        10,
      ),
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
      seedBotCount,
      difficulty,
      network,
      visibility: isPublic ? "public" : "private",
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
