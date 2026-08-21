import {
  type Connection,
  type ConnectionContext,
  Server,
  type WSMessage,
} from "partyserver";
import {
  assignPlayer,
  cancelAssignment,
  closeLobby,
  createMatchmakingQueueState,
  listLobby,
  type MatchmakingQueueState,
  normalizeMatchConfig,
  type OpenLobby,
  updateLobbySeats,
} from "../src/matchmaking/queue";
import type {
  MatchmakingClientMessage,
  MatchmakingServerMessage,
} from "../src/matchmaking/types";

type MatchConnectionState = { playerId?: string; matched?: boolean };

function messageText(raw: WSMessage): string {
  if (typeof raw === "string") return raw;
  if (raw instanceof ArrayBuffer) return new TextDecoder().decode(raw);
  return new TextDecoder().decode(raw);
}

function parseClientMessage(raw: string): MatchmakingClientMessage | null {
  try {
    const data = JSON.parse(raw) as MatchmakingClientMessage;
    if (data.type === "enqueue" || data.type === "cancel") return data;
    return null;
  } catch {
    return null;
  }
}

function migrateQueueState(
  saved: MatchmakingQueueState,
): MatchmakingQueueState {
  const buckets: Record<string, OpenLobby[]> = {};
  for (const [key, lobbies] of Object.entries(saved.buckets ?? {})) {
    buckets[key] = lobbies.map((lobby) => ({
      ...lobby,
      botCount: lobby.botCount ?? 0,
    }));
  }
  return {
    buckets,
    assignments: saved.assignments ?? {},
  };
}

export class MatchmakingParty extends Server<Env> {
  private queue: MatchmakingQueueState = createMatchmakingQueueState();

  async onStart() {
    const saved = await this.ctx.storage.get<MatchmakingQueueState>("queue");
    if (saved) {
      this.queue = migrateQueueState(saved);
    }
  }

  private async persistQueue() {
    await this.ctx.storage.put("queue", this.queue);
  }

  private send(
    connection: Connection<MatchConnectionState>,
    message: MatchmakingServerMessage,
  ) {
    connection.send(JSON.stringify(message));
  }

  /** HTTP from game rooms: POST /close-lobby | /list-lobby | /update-lobby-seats */
  async onRequest(request: Request): Promise<Response> {
    const url = new URL(request.url);
    if (request.method !== "POST") {
      return new Response("Not Found", { status: 404 });
    }

    let body: Record<string, unknown> = {};
    try {
      body = (await request.json()) as Record<string, unknown>;
    } catch {
      return Response.json({ error: "Invalid body." }, { status: 400 });
    }

    const roomId = typeof body.roomId === "string" ? body.roomId.trim() : "";

    if (url.pathname.endsWith("/close-lobby")) {
      if (!roomId) {
        return Response.json({ error: "roomId required." }, { status: 400 });
      }
      const closed = closeLobby(this.queue, roomId);
      await this.persistQueue();
      return Response.json({ closed });
    }

    if (url.pathname.endsWith("/list-lobby")) {
      if (!roomId) {
        return Response.json({ error: "roomId required." }, { status: 400 });
      }
      const config = normalizeMatchConfig(
        typeof body.targetSize === "number" ? body.targetSize : undefined,
        typeof body.fillWithBots === "boolean" ? body.fillWithBots : undefined,
      );
      const lobby = listLobby(this.queue, {
        roomId,
        targetSize: config.targetSize,
        fillWithBots: config.fillWithBots,
        humanCount: typeof body.humanCount === "number" ? body.humanCount : 1,
        botCount: typeof body.botCount === "number" ? body.botCount : 0,
      });
      await this.persistQueue();
      return Response.json({ lobby });
    }

    if (url.pathname.endsWith("/update-lobby-seats")) {
      if (!roomId) {
        return Response.json({ error: "roomId required." }, { status: 400 });
      }
      const lobby = updateLobbySeats(
        this.queue,
        roomId,
        typeof body.humanCount === "number" ? body.humanCount : 0,
        typeof body.botCount === "number" ? body.botCount : 0,
      );
      await this.persistQueue();
      return Response.json({ lobby });
    }

    return new Response("Not Found", { status: 404 });
  }

  async onConnect(
    connection: Connection<MatchConnectionState>,
    _ctx: ConnectionContext,
  ) {
    connection.setState({});
  }

  async onClose(connection: Connection<MatchConnectionState>) {
    const playerId = connection.state?.playerId;
    if (!playerId) return;
    // Successful matches keep their queue seat until the game lobby closes.
    if (connection.state?.matched) return;
    cancelAssignment(this.queue, playerId);
    await this.persistQueue();
  }

  async onMessage(
    connection: Connection<MatchConnectionState>,
    raw: WSMessage,
  ) {
    const message = parseClientMessage(messageText(raw));
    if (!message) {
      this.send(connection, { type: "error", message: "Invalid message." });
      return;
    }

    if (message.type === "cancel") {
      const playerId = connection.state?.playerId;
      if (playerId) {
        cancelAssignment(this.queue, playerId);
        connection.setState({ playerId, matched: false });
        await this.persistQueue();
      }
      return;
    }

    const name = message.name.trim().slice(0, 24);
    if (!name) {
      this.send(connection, { type: "error", message: "Please enter a name." });
      return;
    }

    const playerId = message.playerId ?? crypto.randomUUID().slice(0, 10);
    connection.setState({ playerId, matched: false });

    const config = normalizeMatchConfig(
      message.targetSize,
      message.fillWithBots,
    );
    const assignment = assignPlayer(this.queue, playerId, config);
    await this.persistQueue();

    connection.setState({ playerId, matched: true });
    this.send(connection, {
      type: "matched",
      roomId: assignment.roomId,
      playerId,
      targetSize: assignment.targetSize,
      fillWithBots: assignment.fillWithBots,
    });
  }
}
