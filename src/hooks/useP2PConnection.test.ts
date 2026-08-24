import type { ClientMessage, ServerMessage } from "@cambio/game";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  isLocalDevEndpoint,
  parseLanEndpoint,
} from "../p2p/lan-endpoint";
import {
  createLanGuestTransport,
  type LanSocketLike,
} from "../p2p/lan-transport";
import { P2PHostSession } from "../p2p/p2p-host-session";

type SocketEventName = "open" | "close" | "error" | "message";
type SocketEventListener = (event: { data?: unknown }) => void;

class MockSocket implements LanSocketLike {
  static readonly CONNECTING = 0;
  static readonly OPEN = 1;
  static readonly CLOSED = 3;

  readyState = MockSocket.CONNECTING;
  private peer: MockSocket | null = null;
  private listeners = new Map<SocketEventName, Set<SocketEventListener>>();

  setPeer(peer: MockSocket): void {
    this.peer = peer;
  }

  addEventListener(type: SocketEventName, listener: SocketEventListener): void {
    const set = this.listeners.get(type) ?? new Set<SocketEventListener>();
    set.add(listener);
    this.listeners.set(type, set);
  }

  removeEventListener(
    type: SocketEventName,
    listener: SocketEventListener,
  ): void {
    this.listeners.get(type)?.delete(listener);
  }

  send(data: string): void {
    if (this.readyState !== MockSocket.OPEN) return;
    this.peer?.emit("message", { data });
  }

  close(): void {
    if (this.readyState === MockSocket.CLOSED) return;
    this.readyState = MockSocket.CLOSED;
    this.emit("close", {});
  }

  open(): void {
    if (this.readyState !== MockSocket.CONNECTING) return;
    this.readyState = MockSocket.OPEN;
    this.emit("open", {});
  }

  private emit(type: SocketEventName, event: { data?: unknown }): void {
    const set = this.listeners.get(type);
    if (!set) return;
    for (const listener of set) {
      listener(event);
    }
  }
}

function createSocketPair(): { client: MockSocket; server: MockSocket } {
  const client = new MockSocket();
  const server = new MockSocket();
  client.setPeer(server);
  server.setPeer(client);
  return { client, server };
}

function parseServerPayload(raw: string): ServerMessage | null {
  const parsed = JSON.parse(raw) as { kind?: string; message?: ServerMessage };
  if (parsed.kind !== "server" || !parsed.message) return null;
  return parsed.message;
}

describe("parseLanEndpoint", () => {
  it("parses host IP with default port", () => {
    expect(parseLanEndpoint("192.168.1.20")).toEqual({
      hostIp: "192.168.1.20",
      port: 9876,
    });
  });

  it("parses host IP with explicit port", () => {
    expect(parseLanEndpoint("10.0.0.2:9999")).toEqual({
      hostIp: "10.0.0.2",
      port: 9999,
    });
  });

  it("returns null for invalid endpoint", () => {
    expect(parseLanEndpoint("bad:port")).toBeNull();
    expect(parseLanEndpoint("")).toBeNull();
  });

  it("detects local dev endpoints", () => {
    expect(isLocalDevEndpoint({ hostIp: "127.0.0.1", port: 9876 })).toBe(true);
    expect(isLocalDevEndpoint({ hostIp: "192.168.1.2", port: 9876 })).toBe(
      false,
    );
  });
});

describe("P2PHostSession", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("creates a local host lobby and accepts a guest join", async () => {
    const hostMessages: ServerMessage[] = [];
    const guestMessages: ServerMessage[] = [];
    const sockets = createSocketPair();

    const session = new P2PHostSession({
      roomId: "room-a",
      hostIp: "127.0.0.1",
      onLocalMessage: (message) => {
        hostMessages.push(message);
      },
    });

    const hostResult = await session.connectLocalHost({
      queryPlayerId: null,
      name: "Alice",
      isSolo: false,
      botCount: 1,
      difficulty: "easy",
    });
    expect(hostResult.error).toBeUndefined();

    session.registerGuestSocket(sockets.server);
    const guest = createLanGuestTransport(
      {
        mode: "local",
        roomId: "room-a",
        hostIp: "127.0.0.1",
      },
      {
        webSocketFactory: () => sockets.client,
        onEvent: (event) => {
          if (event.type === "server_message") {
            guestMessages.push(event.message);
          }
        },
      },
    );
    if (!guest) throw new Error("expected guest transport");

    sockets.server.open();
    sockets.client.open();

    const joinMessage: ClientMessage = {
      type: "join",
      playerId: "guest-1",
      name: "Bob",
    };
    expect(guest.send(joinMessage)).toBe(true);

    await vi.waitFor(() => {
      expect(
        guestMessages.some((message) => message.type === "room_info"),
      ).toBe(true);
    });

    await vi.waitFor(() => {
      expect(
        guestMessages.some(
          (message) =>
            message.type === "state" &&
            message.view.players.some((player) => player.name === "Bob"),
        ),
      ).toBe(true);
    });

    expect(
      hostMessages.some(
        (message) =>
          message.type === "state" &&
          message.view.players.some((player) => player.name === "Alice"),
      ),
    ).toBe(true);

    session.close();
    guest.close();
  });

  it("fans out host broadcasts to connected guests", async () => {
    const guestPayloads: string[] = [];
    const guestMessages: ServerMessage[] = [];
    const sockets = createSocketPair();

    const session = new P2PHostSession({
      roomId: "room-b",
      hostIp: "127.0.0.1",
    });

    await session.connectLocalHost({
      queryPlayerId: null,
      name: "Host",
      isSolo: false,
      botCount: 1,
      difficulty: "easy",
    });

    session.registerGuestSocket(sockets.server);

    const guest = createLanGuestTransport(
      {
        mode: "local",
        roomId: "room-b",
        hostIp: "127.0.0.1",
      },
      {
        webSocketFactory: () => sockets.client,
        onEvent: (event) => {
          if (event.type === "server_message") {
            guestMessages.push(event.message);
          }
        },
      },
    );
    if (!guest) throw new Error("expected guest transport");

    sockets.server.open();
    sockets.client.open();

    sockets.client.addEventListener("message", (event) => {
      if (typeof event.data === "string") {
        guestPayloads.push(event.data);
      }
    });

    guest.send({ type: "join", playerId: "guest-2", name: "Guest" });

    await vi.waitFor(() => {
      expect(guestPayloads.length).toBeGreaterThan(0);
    });

    session.relay.broadcast({ type: "error", message: "test-broadcast" });
    expect(
      guestPayloads.some((raw) => {
        const message = parseServerPayload(raw);
        return message?.type === "error" && message.message === "test-broadcast";
      }),
    ).toBe(true);

    session.close();
    guest.close();
  });
});

describe("useP2PConnection return shape", () => {
  it("includes the same public fields as useGameConnection", () => {
    const sharedKeys = [
      "connected",
      "playerId",
      "view",
      "error",
      "fleetingPeek",
      "peekFlash",
      "swapFlash",
      "takeFlash",
      "snapFlash",
      "penaltyFlash",
      "cambioFlash",
      "reshuffleFlash",
      "discardDrawFlash",
      "deckDrawFlash",
      "send",
    ];

    expect(sharedKeys).toHaveLength(15);
    expect(new Set(sharedKeys).size).toBe(15);
  });
});
