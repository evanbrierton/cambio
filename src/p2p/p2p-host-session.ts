import type { ClientMessage, ServerMessage } from "../game/types";
import { parseClientMessageJson } from "../game/wire-schema";
import {
  clampBotCount,
  GameHost,
  type ConnectParams,
  type HostPeer,
} from "../game/host";
import {
  createLanHostRelay,
  type LanHostRelay,
  type LanSocketLike,
} from "./lan-transport";
import type { LanTransportEvent } from "./types";

export type P2PHostSessionOptions = {
  roomId: string;
  hostIp: string;
  port?: number;
  debugEnabled?: boolean;
  onLocalMessage?: (message: ServerMessage) => void;
};

type GuestPeerState = {
  peerId: string;
  playerId: string;
  connected: boolean;
  joined: boolean;
};

export class P2PHostSession {
  readonly gameHost: GameHost;
  readonly relay: LanHostRelay;

  private readonly roomId: string;
  private readonly debugEnabled: boolean;
  private readonly onLocalMessage?: (message: ServerMessage) => void;
  private readonly guestPeers = new Map<string, GuestPeerState>();
  private localPeerId: string | null = null;
  private snapWindowTimer: ReturnType<typeof setTimeout> | null = null;
  private closed = false;

  constructor(options: P2PHostSessionOptions) {
    this.roomId = options.roomId;
    this.debugEnabled = options.debugEnabled ?? false;
    this.onLocalMessage = options.onLocalMessage;
    this.gameHost = new GameHost({
      roomId: options.roomId,
      onSnapWindowSchedule: (endsAt) => {
        this.scheduleSnapWindow(endsAt);
      },
    });

    const relay = createLanHostRelay(
      {
        mode: "local",
        roomId: options.roomId,
        hostIp: options.hostIp,
        port: options.port,
      },
      {
        onEvent: (event) => {
          void this.handleRelayEvent(event);
        },
      },
    );
    if (!relay) {
      throw new Error("LAN host relay requires mode=local.");
    }
    this.relay = relay;
  }

  registerGuestSocket(socket: LanSocketLike): string {
    const clientId = this.relay.registerGuestSocket(socket);
    const peerId = crypto.randomUUID();
    this.guestPeers.set(clientId, {
      peerId,
      playerId: "",
      connected: true,
      joined: false,
    });
    this.gameHost.addPeer(peerId, this.createGuestPeer(clientId));
    return clientId;
  }

  async connectLocalHost(params: ConnectParams): Promise<{
    playerId: string;
    error?: string;
  }> {
    const peerId = crypto.randomUUID();
    this.localPeerId = peerId;
    const peer = this.createLocalPeer();
    this.gameHost.addPeer(peerId, peer);

    const result = await this.gameHost.handleConnect(params);
    if (result.error) {
      this.sendLocal({ type: "error", message: result.error });
      if (result.closeConnection) {
        this.gameHost.removePeer(peerId);
        this.localPeerId = null;
      }
      return result;
    }

    peer.playerId = result.playerId;
    this.sendLocal({
      type: "room_info",
      roomId: this.roomId,
      playerId: result.playerId,
    });
    return result;
  }

  close(): void {
    if (this.closed) return;
    this.closed = true;
    this.clearSnapWindowTimer();
    this.relay.close();
    this.guestPeers.clear();
    if (this.localPeerId) {
      this.gameHost.removePeer(this.localPeerId);
      this.localPeerId = null;
    }
  }

  private createLocalPeer(): HostPeer {
    return {
      playerId: "",
      connected: true,
      send: (message) => {
        this.sendLocal(message);
      },
    };
  }

  private createGuestPeer(clientId: string): HostPeer {
    return {
      playerId: "",
      connected: true,
      send: (message) => {
        this.relay.sendServerMessage(clientId, message);
      },
    };
  }

  private sendLocal(message: ServerMessage): void {
    this.onLocalMessage?.(message);
  }

  private async handleRelayEvent(event: LanTransportEvent): Promise<void> {
    if (this.closed) return;

    if (event.type === "client_message") {
      await this.handleGuestMessage(event.clientId, event.message);
      return;
    }

    if (event.type === "disconnected" && event.role === "host" && event.clientId) {
      await this.handleGuestDisconnect(event.clientId);
    }
  }

  private async handleGuestMessage(
    clientId: string,
    message: ClientMessage,
  ): Promise<void> {
    const guest = this.guestPeers.get(clientId);
    if (!guest) return;

    if (message.type === "join" && !guest.joined) {
      await this.handleGuestConnect(clientId, message.playerId ?? null, message.name);
      return;
    }

    const playerId = guest.playerId;
    if (!playerId) return;

    this.gameHost.clearBotTimerOnMessage();

    if (
      (message.type === "toggle_debug" || message.type === "restart_game") &&
      !this.debugEnabled
    ) {
      this.relay.sendServerMessage(clientId, {
        type: "error",
        message: "Debug options are not enabled for this session.",
      });
      return;
    }

    const parsed = parseClientMessageJson(JSON.stringify(message));
    if (!parsed) {
      this.relay.sendServerMessage(clientId, {
        type: "error",
        message: "Invalid message.",
      });
      return;
    }

    await this.gameHost.dispatchMessage(playerId, parsed, (error) => {
      this.relay.sendServerMessage(clientId, { type: "error", message: error });
    });
  }

  private async handleGuestConnect(
    clientId: string,
    queryPlayerId: string | null,
    name: string,
  ): Promise<void> {
    const guest = this.guestPeers.get(clientId);
    if (!guest || guest.joined) return;

    let playerId = queryPlayerId ?? crypto.randomUUID().slice(0, 10);
    if (this.gameHost.getState()) {
      playerId = this.gameHost.resolveReconnectPlayerId(queryPlayerId, name);
      this.gameHost.closeStalePeers(guest.peerId, playerId);
    }

    const peer = this.gameHost.getPeer(guest.peerId);
    if (peer) peer.playerId = playerId;

    const result = await this.gameHost.handleConnect({
      queryPlayerId: playerId,
      name,
      isSolo: false,
      botCount: clampBotCount(1),
      difficulty: "easy",
    });

    if (result.error) {
      this.relay.sendServerMessage(clientId, {
        type: "error",
        message: result.error,
      });
      if (result.closeConnection) {
        await this.handleGuestDisconnect(clientId);
      }
      return;
    }

    guest.playerId = result.playerId;
    guest.joined = true;
    if (peer) peer.playerId = result.playerId;

    this.relay.sendServerMessage(clientId, {
      type: "room_info",
      roomId: this.roomId,
      playerId: result.playerId,
    });
  }

  private async handleGuestDisconnect(clientId: string): Promise<void> {
    const guest = this.guestPeers.get(clientId);
    if (!guest) return;

    const peer = this.gameHost.getPeer(guest.peerId);
    if (peer) peer.connected = false;

    if (guest.playerId) {
      await this.gameHost.handleDisconnect(guest.playerId, guest.peerId);
    }
    this.gameHost.removePeer(guest.peerId);
    this.guestPeers.delete(clientId);
  }

  private scheduleSnapWindow(endsAt: number | null): void {
    this.clearSnapWindowTimer();
    if (endsAt == null) return;
    const delay = Math.max(0, endsAt - Date.now());
    this.snapWindowTimer = setTimeout(() => {
      this.snapWindowTimer = null;
      void this.gameHost.onSnapWindowAlarm();
    }, delay);
  }

  private clearSnapWindowTimer(): void {
    if (!this.snapWindowTimer) return;
    clearTimeout(this.snapWindowTimer);
    this.snapWindowTimer = null;
  }
}
