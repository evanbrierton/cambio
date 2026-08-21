import { afterEach, describe, expect, it, vi } from "vitest";
import { createCapacitorClipboardAdapter } from "./capacitor-clipboard";
import type { ClipboardAdapter } from "./types";

const originalWindow = globalThis.window;

function setWindowCapacitor(capacitor: {
  isNativePlatform?: () => boolean;
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

describe("createCapacitorClipboardAdapter", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    resetWindow();
  });

  it("falls back to web clipboard when not on native platform", async () => {
    setWindowCapacitor({
      isNativePlatform: () => false,
      Plugins: {},
    });
    const fallbackCopy = vi
      .fn<ClipboardAdapter["copyText"]>()
      .mockResolvedValue(true);
    const adapter = createCapacitorClipboardAdapter({
      copyText: fallbackCopy,
    });

    await expect(adapter.copyText("ROOM123")).resolves.toBe(true);
    expect(fallbackCopy).toHaveBeenCalledWith("ROOM123");
  });

  it("uses native clipboard on native platforms when plugin exists", async () => {
    const nativeWrite = vi.fn().mockResolvedValue(undefined);
    setWindowCapacitor({
      isNativePlatform: () => true,
      Plugins: {
        Clipboard: {
          write: nativeWrite,
        },
      },
    });
    const fallbackCopy = vi
      .fn<ClipboardAdapter["copyText"]>()
      .mockResolvedValue(false);
    const adapter = createCapacitorClipboardAdapter({
      copyText: fallbackCopy,
    });

    await expect(adapter.copyText("ROOM123")).resolves.toBe(true);
    expect(nativeWrite).toHaveBeenCalledWith({ string: "ROOM123" });
    expect(fallbackCopy).not.toHaveBeenCalled();
  });

  it("falls back when native clipboard write fails", async () => {
    const nativeWrite = vi.fn().mockRejectedValue(new Error("no plugin"));
    setWindowCapacitor({
      isNativePlatform: () => true,
      Plugins: {
        Clipboard: {
          write: nativeWrite,
        },
      },
    });
    const fallbackCopy = vi
      .fn<ClipboardAdapter["copyText"]>()
      .mockResolvedValue(true);
    const adapter = createCapacitorClipboardAdapter({
      copyText: fallbackCopy,
    });

    await expect(adapter.copyText("ROOM123")).resolves.toBe(true);
    expect(nativeWrite).toHaveBeenCalledWith({ string: "ROOM123" });
    expect(fallbackCopy).toHaveBeenCalledWith("ROOM123");
  });
});
