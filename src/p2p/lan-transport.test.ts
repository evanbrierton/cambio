import type { ClientMessage, ServerMessage } from "@cambio/game";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  buildLanRoomUrl,
  createLanGuestTransport,
  createLanHostRelay,
  deserializeClientMessage,
  deserializeServerMessage,
  serializeClientMessage,
  serializeServerMessage,
  type LanSocketLike,
} from "./lan-transport";
import type { LanTransportEvent } from "./types";

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
    const set = this.listeners.get(type);
    if (!set) return;
    set.delete(listener);
  }

  send(data: string): void {
    if (this.readyState !== MockSocket.OPEN) return;
    this.peer?.emit("message", { data });
  }

  close(): void {
    if (this.readyState === MockSocket.CLOSED) return;
    this.readyState = MockSocket.CLOSED;
    this.emit("close", {});

    if (this.peer && this.peer.readyState !== MockSocket.CLOSED) {
      this.peer.readyState = MockSocket.CLOSED;
      this.peer.emit("close", {});
    }
  }

  open(): void {
    if (this.readyState !== MockSocket.CONNECTING) return;
    this.readyState = MockSocket.OPEN;
    this.emit("open", {});
  }

  emitError(): void {
    this.emit("error", {});
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

describe("lan-transport", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("round-trips client/server JSON serialization with wire types", () => {
    const clientMessage: ClientMessage = { type: "chat", text: "hello" };
    const serverMessage: ServerMessage = { type: "error", message: "oops" };

    const clientRaw = serializeClientMessage(clientMessage);
    const serverRaw = serializeServerMessage(serverMessage);

    expect(deserializeClientMessage(clientRaw)).toEqual(clientMessage);
    expect(deserializeServerMessage(serverRaw)).toEqual(serverMessage);
  });

  it("fans out server messages and collects client messages", () => {
    const hostEvents: LanTransportEvent[] = [];
    const guestEvents: LanTransportEvent[] = [];
    const sockets = createSocketPair();
    const createdUrls: string[] = [];

    const host = createLanHostRelay(
      {
        mode: "local",
        roomId: "room-a",
        hostIp: "192.168.1.20",
      },
      {
        onEvent: (event) => {
          hostEvents.push(event);
        },
      },
    );
    if (!host) throw new Error("expected local relay");

    const clientId = host.registerGuestSocket(sockets.server, "guest-1");
    expect(clientId).toBe("guest-1");

    const guest = createLanGuestTransport(
      {
        mode: "local",
        roomId: "room-a",
        hostIp: "192.168.1.20",
      },
      {
        webSocketFactory: (url) => {
          createdUrls.push(url);
          return sockets.client;
        },
        onEvent: (event) => {
          guestEvents.push(event);
        },
      },
    );
    if (!guest) throw new Error("expected local guest transport");

    sockets.server.open();
    sockets.client.open();

    expect(createdUrls).toEqual(["ws://192.168.1.20:9876/room/room-a"]);
    expect(guest.url).toBe(
      buildLanRoomUrl({ hostIp: "192.168.1.20", roomId: "room-a" }),
    );

    const serverMessage: ServerMessage = { type: "error", message: "host-msg" };
    host.broadcast(serverMessage);
    expect(
      guestEvents.some(
        (event) =>
          event.type === "server_message" && event.message.message === "host-msg",
      ),
    ).toBe(true);

    const clientMessage: ClientMessage = { type: "chat", text: "guest-msg" };
    expect(guest.send(clientMessage)).toBe(true);
    expect(
      hostEvents.some(
        (event) =>
          event.type === "client_message" &&
          event.clientId === "guest-1" &&
          event.message.type === "chat" &&
          event.message.text === "guest-msg",
      ),
    ).toBe(true);

    host.close();
    expect(
      guestEvents.some(
        (event) =>
          event.type === "disconnected" &&
          event.role === "guest" &&
          event.reason === "host_closed",
      ),
    ).toBe(true);
  });

  it("detects heartbeat disconnect within five seconds", () => {
    vi.useFakeTimers();

    const guestEvents: LanTransportEvent[] = [];
    const sockets = createSocketPair();

    const guest = createLanGuestTransport(
      {
        mode: "local",
        roomId: "room-timeout",
        hostIp: "10.0.0.2",
        heartbeatIntervalMs: 3000,
        heartbeatTimeoutMs: 5000,
      },
      {
        webSocketFactory: () => sockets.client,
        onEvent: (event) => {
          guestEvents.push(event);
        },
      },
    );
    if (!guest) throw new Error("expected local guest transport");

    sockets.server.open();
    sockets.client.open();

    vi.advanceTimersByTime(5001);

    expect(
      guestEvents.some(
        (event) =>
          event.type === "disconnected" &&
          event.role === "guest" &&
          event.reason === "heartbeat_timeout",
      ),
    ).toBe(true);
  });

  it("is inert unless mode is local", () => {
    const host = createLanHostRelay({
      mode: "online",
      roomId: "room-a",
      hostIp: "127.0.0.1",
    });
    const guest = createLanGuestTransport({
      mode: "online",
      roomId: "room-a",
      hostIp: "127.0.0.1",
    });

    expect(host).toBeNull();
    expect(guest).toBeNull();
  });
});
