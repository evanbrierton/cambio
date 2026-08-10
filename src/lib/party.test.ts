import { afterEach, describe, expect, it, vi } from "vitest";
import { DEFAULT_PARTY_HOST, getPartyHost } from "./party";

describe("getPartyHost", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("prefers NEXT_PUBLIC_PARTYKIT_HOST when set", () => {
    vi.stubEnv("NEXT_PUBLIC_PARTYKIT_HOST", "custom.example.workers.dev");
    expect(getPartyHost()).toBe("custom.example.workers.dev");
  });

  it("uses local wrangler port on localhost", () => {
    vi.stubEnv("NEXT_PUBLIC_PARTYKIT_HOST", "");
    vi.stubGlobal("location", { hostname: "localhost" });
    expect(getPartyHost()).toBe("localhost:8787");
  });

  it("uses LAN hostname with wrangler port for phone-on-LAN testing", () => {
    vi.stubEnv("NEXT_PUBLIC_PARTYKIT_HOST", "");
    vi.stubGlobal("location", { hostname: "192.168.1.20" });
    expect(getPartyHost()).toBe("192.168.1.20:8787");
  });

  it("falls back to the production Worker on Vercel preview hosts", () => {
    vi.stubEnv("NEXT_PUBLIC_PARTYKIT_HOST", "");
    vi.stubGlobal("location", {
      hostname: "cambio-4id5zc08o-evan-briertons-projects.vercel.app",
    });
    expect(getPartyHost()).toBe(DEFAULT_PARTY_HOST);
  });

  it("falls back to the production Worker when location is unavailable", () => {
    vi.stubEnv("NEXT_PUBLIC_PARTYKIT_HOST", "");
    vi.stubGlobal("location", undefined);
    expect(getPartyHost()).toBe(DEFAULT_PARTY_HOST);
  });
});
