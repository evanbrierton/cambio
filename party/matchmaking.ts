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
  type MatchmakingQueueState,
  normalizeMatchConfig,
} from "../src/matchmaking/queue";
import type {
  MatchmakingClientMessage,
  MatchmakingServerMessage,
} from "../src/matchmaking/types";

type MatchConnectionState = { playerId?: string };

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

export class MatchmakingParty extends Server<Env> {
  private queue: MatchmakingQueueState = createMatchmakingQueueState();

  async onStart() {
    const saved = await this.ctx.storage.get<MatchmakingQueueState>("queue");
    if (saved) {
      this.queue = saved;
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

  /** HTTP from game rooms: POST /close-lobby { roomId } */
  async onRequest(request: Request): Promise<Response> {
    const url = new URL(request.url);
    if (request.method === "POST" && url.pathname.endsWith("/close-lobby")) {
      let roomId = "";
      try {
        const body = (await request.json()) as { roomId?: string };
        roomId = body.roomId?.trim() ?? "";
      } catch {
        return Response.json({ error: "Invalid body." }, { status: 400 });
      }
      if (!roomId) {
        return Response.json({ error: "roomId required." }, { status: 400 });
      }
      const closed = closeLobby(this.queue, roomId);
      await this.persistQueue();
      return Response.json({ closed });
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
    connection.setState({ playerId });

    const config = normalizeMatchConfig(
      message.targetSize,
      message.fillWithBots,
    );
    const assignment = assignPlayer(this.queue, playerId, config);
    await this.persistQueue();

    this.send(connection, {
      type: "matched",
      roomId: assignment.roomId,
      playerId,
      targetSize: assignment.targetSize,
      fillWithBots: assignment.fillWithBots,
    });
  }
}
