import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  mountHostReliability,
  requestScreenWakeLock,
} from "./useHostReliability";

describe("requestScreenWakeLock", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns null when Wake Lock is unavailable", async () => {
    vi.stubGlobal("navigator", {});
    await expect(requestScreenWakeLock()).resolves.toBeNull();
  });

  it("requests a screen wake lock when supported", async () => {
    const release = vi.fn().mockResolvedValue(undefined);
    const request = vi.fn().mockResolvedValue({ release });
    vi.stubGlobal("navigator", { wakeLock: { request } });

    const sentinel = await requestScreenWakeLock();

    expect(request).toHaveBeenCalledWith("screen");
    expect(sentinel).toEqual({ release });
  });
});

describe("mountHostReliability", () => {
  let release: ReturnType<typeof vi.fn>;
  let request: ReturnType<typeof vi.fn>;
  let visibilityState = "visible";
  const listeners = new Map<string, Set<EventListener>>();

  beforeEach(() => {
    release = vi.fn().mockResolvedValue(undefined);
    request = vi.fn().mockResolvedValue({ release });
    visibilityState = "visible";
    listeners.clear();
    vi.stubGlobal("navigator", { wakeLock: { request } });
    vi.stubGlobal("document", {
      get visibilityState() {
        return visibilityState;
      },
      addEventListener(type: string, listener: EventListener) {
        const set = listeners.get(type) ?? new Set<EventListener>();
        set.add(listener);
        listeners.set(type, set);
      },
      removeEventListener(type: string, listener: EventListener) {
        listeners.get(type)?.delete(listener);
      },
      dispatchEvent(event: Event) {
        for (const listener of listeners.get(event.type) ?? []) {
          listener(event);
        }
        return true;
      },
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("requests wake lock while hosting an active game", async () => {
    const dispose = mountHostReliability({
      enabled: true,
      gameActive: true,
    });

    await vi.waitFor(() => {
      expect(request).toHaveBeenCalledWith("screen");
    });

    dispose();
    await vi.waitFor(() => {
      expect(release).toHaveBeenCalled();
    });
  });

  it("does not request wake lock when disabled", async () => {
    const dispose = mountHostReliability({
      enabled: false,
      gameActive: true,
    });

    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(request).not.toHaveBeenCalled();
    dispose();
  });

  it("fires visibility callbacks and re-requests wake lock when visible again", async () => {
    const onVisibilityHidden = vi.fn();
    const onVisibilityVisible = vi.fn();
    const dispose = mountHostReliability({
      enabled: true,
      gameActive: true,
      onVisibilityHidden,
      onVisibilityVisible,
    });

    await vi.waitFor(() => {
      expect(request).toHaveBeenCalledTimes(1);
    });
    await new Promise((resolve) => setTimeout(resolve, 0));

    visibilityState = "hidden";
    document.dispatchEvent(new Event("visibilitychange"));

    expect(onVisibilityHidden).toHaveBeenCalled();
    await vi.waitFor(() => {
      expect(release).toHaveBeenCalled();
    });

    visibilityState = "visible";
    document.dispatchEvent(new Event("visibilitychange"));

    expect(onVisibilityVisible).toHaveBeenCalled();
    await vi.waitFor(() => {
      expect(request).toHaveBeenCalledTimes(2);
    });

    dispose();
  });
});
