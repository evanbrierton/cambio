import { DEFAULT_LAN_PORT } from "./types";

export type ParsedLanEndpoint = {
  hostIp: string;
  port: number;
};

export function parseLanEndpoint(raw: string | null | undefined): ParsedLanEndpoint | null {
  const trimmed = raw?.trim();
  if (!trimmed) return null;

  const lastColon = trimmed.lastIndexOf(":");
  if (lastColon === -1) {
    return { hostIp: trimmed, port: DEFAULT_LAN_PORT };
  }

  const hostIp = trimmed.slice(0, lastColon).trim();
  const portRaw = trimmed.slice(lastColon + 1).trim();
  const port = Number.parseInt(portRaw, 10);
  if (!hostIp || !Number.isFinite(port) || port <= 0 || port > 65535) {
    return null;
  }

  return { hostIp, port };
}

export function isLocalDevEndpoint(endpoint: ParsedLanEndpoint): boolean {
  return (
    endpoint.hostIp === "127.0.0.1" ||
    endpoint.hostIp === "localhost" ||
    endpoint.hostIp === "::1"
  );
}
