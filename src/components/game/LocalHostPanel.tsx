"use client";

import { hapticClick } from "@cambio/client";
import { AlertTriangle, Check, Copy } from "lucide-react";
import { useCallback, useMemo, useState } from "react";
import { copyToClipboard } from "@/lib/clipboard";
import { DEFAULT_LAN_PORT } from "@/p2p/types";

type LocalHostPanelProps = {
  roomId: string;
  isHost: boolean;
  endpoint: string | null;
  error: string | null;
  connected: boolean;
};

const CHROME_ICON_CLASS = "size-3.5 shrink-0";

function formatGuestError(error: string): string {
  if (error === "Could not connect to game server.") {
    return "Could not reach the host. Check the IP:port and that you are on the same Wi‑Fi.";
  }
  if (error === "Host disconnected.") {
    return "The host left the game.";
  }
  if (error === "Lost connection to host.") {
    return "Lost connection to the host.";
  }
  if (error === "Local mode is unavailable.") {
    return "Nearby play is unavailable on this device.";
  }
  return error;
}

export function LocalHostPanel({
  roomId,
  isHost,
  endpoint,
  error,
  connected,
}: LocalHostPanelProps) {
  const [roomCopied, setRoomCopied] = useState(false);
  const [endpointCopied, setEndpointCopied] = useState(false);

  const roomCode = roomId.toUpperCase();
  const endpointLabel = useMemo(() => {
    if (endpoint) return endpoint;
    if (typeof window === "undefined") return `127.0.0.1:${DEFAULT_LAN_PORT}`;
    return `${window.location.hostname}:${DEFAULT_LAN_PORT}`;
  }, [endpoint]);

  const copyText = useCallback((text: string, kind: "room" | "endpoint") => {
    hapticClick("selection");
    void copyToClipboard(text).then((copied) => {
      if (!copied) return;
      if (kind === "room") {
        setRoomCopied(true);
        window.setTimeout(() => setRoomCopied(false), 2000);
      } else {
        setEndpointCopied(true);
        window.setTimeout(() => setEndpointCopied(false), 2000);
      }
    });
  }, []);

  const guestError = !isHost && error ? formatGuestError(error) : null;

  return (
    <div className="pixel-border bg-surface-elevated p-3 sm:p-4 space-y-3 text-left">
      <div className="space-y-1">
        <p className="font-display text-[10px] text-theme-muted tracking-widest">
          PLAY NEARBY
        </p>
        <p className="font-display text-[8px] text-theme-muted normal-case tracking-normal">
          Same Wi‑Fi — no internet required
        </p>
      </div>

      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="font-display text-[8px] text-theme-muted">Room code</p>
          <p className="font-mono text-sm text-theme tracking-widest">
            {roomCode}
          </p>
        </div>
        <button
          type="button"
          onClick={() => copyText(roomCode, "room")}
          aria-live="polite"
          aria-label={roomCopied ? "Copied room code" : "Copy room code"}
          className={`chip-btn chip-btn-sm inline-flex items-center gap-1.5 px-2 py-1 border-theme-muted text-theme hover:border-accent transition-colors shrink-0 ${
            roomCopied ? "border-accent text-accent" : ""
          }`}
        >
          {roomCopied ? (
            <Check aria-hidden className={CHROME_ICON_CLASS} />
          ) : (
            <Copy aria-hidden className={CHROME_ICON_CLASS} />
          )}
          <span className="font-display text-[8px]">
            {roomCopied ? "COPIED" : "COPY"}
          </span>
        </button>
      </div>

      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="font-display text-[8px] text-theme-muted">
            Host endpoint
          </p>
          <p className="font-mono text-xs sm:text-sm text-theme truncate">
            {endpointLabel}
          </p>
        </div>
        <button
          type="button"
          onClick={() => copyText(endpointLabel, "endpoint")}
          aria-live="polite"
          aria-label={
            endpointCopied ? "Copied host endpoint" : "Copy host endpoint"
          }
          className={`chip-btn chip-btn-sm inline-flex items-center gap-1.5 px-2 py-1 border-theme-muted text-theme hover:border-accent transition-colors shrink-0 ${
            endpointCopied ? "border-accent text-accent" : ""
          }`}
        >
          {endpointCopied ? (
            <Check aria-hidden className={CHROME_ICON_CLASS} />
          ) : (
            <Copy aria-hidden className={CHROME_ICON_CLASS} />
          )}
          <span className="font-display text-[8px]">
            {endpointCopied ? "COPIED" : "COPY"}
          </span>
        </button>
      </div>

      {isHost ? (
        <div className="flex gap-2 rounded-panel border border-amber-500/30 bg-amber-500/10 px-3 py-2">
          <AlertTriangle
            aria-hidden
            className="size-4 shrink-0 text-amber-400 mt-0.5"
          />
          <div className="space-y-1 min-w-0">
            <p className="font-display text-[8px] text-amber-200/90 normal-case tracking-normal">
              Keep this device awake while hosting.
            </p>
            <p className="font-display text-[8px] text-theme-muted normal-case tracking-normal">
              Guests enter the room code and this IP:port on their device.
            </p>
          </div>
        </div>
      ) : null}

      {guestError ? (
        <div
          role="alert"
          className="flex gap-2 rounded-panel border border-red-500/30 bg-red-500/10 px-3 py-2"
        >
          <AlertTriangle
            aria-hidden
            className="size-4 shrink-0 text-red-400 mt-0.5"
          />
          <p className="font-display text-[8px] text-red-200/90 normal-case tracking-normal">
            {guestError}
          </p>
        </div>
      ) : !isHost && !connected && !error ? (
        <p className="font-display text-[8px] text-theme-muted text-center animate-pulse normal-case tracking-normal">
          Connecting to host…
        </p>
      ) : null}
    </div>
  );
}
