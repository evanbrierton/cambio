import { afterEach, describe, expect, it, vi } from "vitest";
import {
  applyNativeShellChrome,
  canUseNativeShare,
  copyWithNativeClipboard,
  isNativePlatform,
  shareRoomInvite,
  triggerCambioHaptic,
  triggerSnapHaptic,
} from "./capacitor";

const originalWindow = globalThis.window;

function setWindowCapacitor(capacitor: {
  isNativePlatform?: () => boolean;
  registerPlugin?: <T>(name: string) => T;
  Plugins?: Record<string, unknown>;
}) {
  (globalThis as { window?: Window }).window = {
    Capacitor: capacitor,
  } as unknown as Window;
}

function resetWindow() {
  if (originalWindow) {
    (globalThis as { window?: Window }).window = originalWindow;
    return;
  }
  delete (globalThis as { window?: Window }).window;
}

describe("capacitor native plugin bridge", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    resetWindow();
  });

  it("treats missing Capacitor as web", () => {
    setWindowCapacitor({});
    expect(isNativePlatform()).toBe(false);
    expect(canUseNativeShare()).toBe(false);
  });

  it("registers haptics when the JS plugin package was not imported", async () => {
    const impact = vi.fn().mockResolvedValue(undefined);
    const notification = vi.fn().mockResolvedValue(undefined);
    const registerPlugin = vi.fn((name: string) => {
      if (name !== "Haptics") return {};
      return { impact, notification };
    });
    setWindowCapacitor({
      isNativePlatform: () => true,
      Plugins: {},
      registerPlugin: registerPlugin as <T>(name: string) => T,
    });

    await triggerSnapHaptic();
    await triggerCambioHaptic();

    expect(registerPlugin).toHaveBeenCalledWith("Haptics");
    expect(impact).toHaveBeenCalledWith({ style: "LIGHT" });
    expect(notification).toHaveBeenCalledWith({ type: "SUCCESS" });
  });

  it("registers clipboard and share through the native bridge", async () => {
    const write = vi.fn().mockResolvedValue(undefined);
    const share = vi.fn().mockResolvedValue(undefined);
    const registerPlugin = vi.fn((name: string) => {
      if (name === "Clipboard") return { write };
      if (name === "Share") return { share };
      return {};
    });
    setWindowCapacitor({
      isNativePlatform: () => true,
      Plugins: {},
      registerPlugin: registerPlugin as <T>(name: string) => T,
    });

    await expect(copyWithNativeClipboard("ROOM123")).resolves.toBe(true);
    await expect(
      shareRoomInvite({
        roomCode: "ROOM123",
        roomUrl: "https://example.com/play/room123",
      }),
    ).resolves.toBe(true);
    expect(canUseNativeShare()).toBe(true);
    expect(write).toHaveBeenCalledWith({ string: "ROOM123" });
    expect(share).toHaveBeenCalled();
  });

  it("asks StatusBar to overlay the WebView on native shells", async () => {
    const setOverlaysWebView = vi.fn().mockResolvedValue(undefined);
    const setStyle = vi.fn().mockResolvedValue(undefined);
    const setBackgroundColor = vi.fn().mockResolvedValue(undefined);
    setWindowCapacitor({
      isNativePlatform: () => true,
      Plugins: {
        StatusBar: { setOverlaysWebView, setStyle, setBackgroundColor },
      },
    });

    await applyNativeShellChrome();

    expect(setOverlaysWebView).toHaveBeenCalledWith({ overlay: true });
    expect(setStyle).toHaveBeenCalledWith({ style: "LIGHT" });
    expect(setBackgroundColor).toHaveBeenCalledWith({ color: "#12061f" });
  });

  it("does not call plugins on web", async () => {
    const impact = vi.fn();
    setWindowCapacitor({
      isNativePlatform: () => false,
      Plugins: { Haptics: { impact } },
    });

    await triggerSnapHaptic();
    expect(impact).not.toHaveBeenCalled();
  });
});
