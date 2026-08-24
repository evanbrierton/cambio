import type { LanSocketLike, LanWebSocketFactory } from "./lan-transport";

type SocketEventName = "open" | "close" | "error" | "message";
type SocketEventListener = (event: { data?: unknown }) => void;

type BridgeMessage =
  | { type: "host-register"; roomId: string }
  | { type: "guest-connect"; roomId: string }
  | { type: "guest-socket"; roomId: string; guestId: string }
  | {
      type: "relay";
      roomId: string;
      guestId: string;
      data: string;
    };

const OPEN = 1;
const CLOSED = 3;

class DevBridgeSocket implements LanSocketLike {
  private readonly listeners = new Map<SocketEventName, Set<SocketEventListener>>();
  private closed = false;
  readyState = 0;

  constructor(
    private readonly port: MessagePort,
    private readonly guestId: string,
    private readonly roomId: string,
  ) {
    this.port.onmessage = (event: MessageEvent<BridgeMessage>) => {
      const message = event.data;
      if (!message || message.type !== "relay") return;
      if (message.roomId !== this.roomId || message.guestId !== this.guestId) return;
      this.emit("message", { data: message.data });
    };
  }

  addEventListener(type: SocketEventName, listener: SocketEventListener): void {
    const set = this.listeners.get(type) ?? new Set<SocketEventListener>();
    set.add(listener);
    this.listeners.set(type, set);
  }

  removeEventListener(type: SocketEventName, listener: SocketEventListener): void {
    this.listeners.get(type)?.delete(listener);
  }

  send(data: string): void {
    if (this.readyState !== OPEN) return;
    this.port.postMessage({
      type: "relay",
      roomId: this.roomId,
      guestId: this.guestId,
      data,
    } satisfies BridgeMessage);
  }

  close(): void {
    if (this.closed) return;
    this.closed = true;
    this.readyState = CLOSED;
    this.emit("close", {});
    this.port.close();
  }

  open(): void {
    if (this.closed) return;
    this.readyState = OPEN;
    queueMicrotask(() => {
      this.emit("open", {});
    });
  }

  private emit(type: SocketEventName, event: { data?: unknown }): void {
    const set = this.listeners.get(type);
    if (!set) return;
    for (const listener of set) {
      listener(event);
    }
  }
}

type SharedBridgeWorker = SharedWorker & {
  port: MessagePort;
};

let worker: SharedBridgeWorker | null = null;
let workerInitFailed = false;

function getWorkerPort(): MessagePort | null {
  if (workerInitFailed || typeof SharedWorker === "undefined") return null;
  if (worker) return worker.port;

  const workerSource = `
    const hosts = new Map();
    const guestPorts = new Map();
    const guestPortIds = new WeakMap();

    self.onconnect = (event) => {
      const port = event.ports[0];
      port.onmessage = (messageEvent) => {
        const message = messageEvent.data;
        if (!message || typeof message.type !== "string") return;

        if (message.type === "host-register") {
          hosts.set(message.roomId, port);
          return;
        }

        if (message.type === "guest-connect") {
          const guestId = "guest-" + Math.random().toString(36).slice(2, 10);
          guestPorts.set(guestId, port);
          guestPortIds.set(port, guestId);
          port.postMessage({ type: "guest-socket", roomId: message.roomId, guestId });
          const host = hosts.get(message.roomId);
          host?.postMessage({ type: "guest-socket", roomId: message.roomId, guestId });
          return;
        }

        if (message.type === "relay") {
          if (guestPortIds.has(port)) {
            hosts.get(message.roomId)?.postMessage(message);
            return;
          }
          guestPorts.get(message.guestId)?.postMessage(message);
        }
      };
    };
  `;

  try {
    const blob = new Blob([workerSource], { type: "application/javascript" });
    worker = new SharedWorker(URL.createObjectURL(blob), {
      name: "cambio-lan-dev-bridge",
    }) as SharedBridgeWorker;
    worker.port.start();
    return worker.port;
  } catch {
    workerInitFailed = true;
    return null;
  }
}

export function registerDevBridgeHost(
  roomId: string,
  registerGuest: (socket: LanSocketLike) => void,
): (() => void) | null {
  const port = getWorkerPort();
  if (!port) return null;

  const onMessage = (event: MessageEvent<BridgeMessage>) => {
    const message = event.data;
    if (!message || message.type !== "guest-socket" || message.roomId !== roomId) {
      return;
    }

    const hostSocket = new DevBridgeSocket(port, message.guestId, roomId);
    registerGuest(hostSocket);
    hostSocket.open();
  };

  port.addEventListener("message", onMessage);
  port.postMessage({ type: "host-register", roomId } satisfies BridgeMessage);

  return () => {
    port.removeEventListener("message", onMessage);
  };
}

export function createDevBridgeWebSocketFactory(
  roomId: string,
): LanWebSocketFactory | null {
  const port = getWorkerPort();
  if (!port) return null;

  return () => {
    let socket: DevBridgeSocket | null = null;
    let pendingOpen: Array<() => void> = [];

    const onMessage = (event: MessageEvent<BridgeMessage>) => {
      const message = event.data;
      if (!message || message.type !== "guest-socket" || message.roomId !== roomId) {
        return;
      }
      socket = new DevBridgeSocket(port, message.guestId, roomId);
      port.removeEventListener("message", onMessage);
      socket.open();
      for (const callback of pendingOpen) callback();
      pendingOpen = [];
    };

    port.addEventListener("message", onMessage);
    port.postMessage({ type: "guest-connect", roomId } satisfies BridgeMessage);

    const facade: LanSocketLike = {
      get readyState() {
        return socket?.readyState ?? 0;
      },
      send(data: string) {
        socket?.send(data);
      },
      close() {
        socket?.close();
      },
      addEventListener(type, listener) {
        if (socket) {
          socket.addEventListener(type, listener);
          return;
        }
        if (type === "open") {
          pendingOpen.push(() => socket?.addEventListener(type, listener));
          return;
        }
        pendingOpen.push(() => socket?.addEventListener(type, listener));
      },
      removeEventListener(type, listener) {
        socket?.removeEventListener(type, listener);
      },
    };

    return facade;
  };
}
