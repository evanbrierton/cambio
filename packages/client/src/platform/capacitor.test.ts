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

function setNativeWindow(partial: {
  Capacitor?: {
    isNativePlatform?: () => boolean;
    getPlatform?: () => string;
    registerPlugin?: <T>(name: string) => T;
    nativePromise?: (
      pluginName: string,
      methodName: string,
      options?: unknown,
    ) => Promise<unknown>;
    isPluginAvailable?: (name: string) => boolean;
    Plugins?: Record<string, unknown>;
  };
  webkit?: { messageHandlers?: { bridge?: unknown } };
  androidBridge?: unknown;
}) {
  (globalThis as { window?: Window }).window = partial as unknown as Window;
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
    setNativeWindow({ Capacitor: {} });
    expect(isNativePlatform()).toBe(false);
    expect(canUseNativeShare()).toBe(false);
  });

  it("detects an iOS Capacitor WebView from the native bridge object", () => {
    setNativeWindow({
      webkit: { messageHandlers: { bridge: {} } },
    });
    expect(isNativePlatform()).toBe(true);
  });

  it("calls haptics through nativePromise on the injected iOS bridge", async () => {
    const nativePromise = vi.fn().mockResolvedValue(undefined);
    setNativeWindow({
      Capacitor: {
        isNativePlatform: () => true,
        Plugins: {},
        nativePromise,
      },
    });

    await triggerSnapHaptic();
    await triggerCambioHaptic();

    expect(nativePromise).toHaveBeenCalledWith("Haptics", "impact", {
      style: "LIGHT",
    });
    expect(nativePromise).toHaveBeenCalledWith("Haptics", "notification", {
      type: "SUCCESS",
    });
  });

  it("uses JSExport plugin stubs when nativePromise is absent", async () => {
    const impact = vi.fn().mockResolvedValue(undefined);
    const notification = vi.fn().mockResolvedValue(undefined);
    setNativeWindow({
      Capacitor: {
        isNativePlatform: () => true,
        Plugins: { Haptics: { impact, notification } },
      },
    });

    await triggerSnapHaptic();
    await triggerCambioHaptic();

    expect(impact).toHaveBeenCalledWith({ style: "LIGHT" });
    expect(notification).toHaveBeenCalledWith({ type: "SUCCESS" });
  });

  it("registers haptics when the JS plugin package was not imported", async () => {
    const impact = vi.fn().mockResolvedValue(undefined);
    const notification = vi.fn().mockResolvedValue(undefined);
    const registerPlugin = vi.fn((name: string) => {
      if (name !== "Haptics") return {};
      return { impact, notification };
    });
    setNativeWindow({
      Capacitor: {
        isNativePlatform: () => true,
        Plugins: {},
        registerPlugin: registerPlugin as <T>(name: string) => T,
      },
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
    setNativeWindow({
      Capacitor: {
        isNativePlatform: () => true,
        Plugins: {},
        registerPlugin: registerPlugin as <T>(name: string) => T,
      },
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
    setNativeWindow({
      Capacitor: {
        isNativePlatform: () => true,
        Plugins: {
          StatusBar: { setOverlaysWebView, setStyle, setBackgroundColor },
        },
      },
    });

    await applyNativeShellChrome();

    expect(setOverlaysWebView).toHaveBeenCalledWith({ overlay: true });
    expect(setStyle).toHaveBeenCalledWith({ style: "DARK" });
    expect(setBackgroundColor).toHaveBeenCalledWith({ color: "#12061f" });
  });

  it("does not call plugins on web", async () => {
    const impact = vi.fn();
    setNativeWindow({
      Capacitor: {
        isNativePlatform: () => false,
        Plugins: { Haptics: { impact } },
      },
    });

    await triggerSnapHaptic();
    expect(impact).not.toHaveBeenCalled();
  });
});
