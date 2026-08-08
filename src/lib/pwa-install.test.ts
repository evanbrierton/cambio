import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  clearInstallDismiss,
  dismissInstallPrompt,
  isInstallDismissed,
  isIosDevice,
  isStandaloneDisplay,
  PWA_INSTALL_DISMISS_KEY,
  PWA_INSTALL_DISMISS_MS,
} from "./pwa-install";

function createMemoryStorage(): Storage {
  const map = new Map<string, string>();
  return {
    get length() {
      return map.size;
    },
    clear: () => map.clear(),
    getItem: (key) => map.get(key) ?? null,
    key: (index) => [...map.keys()][index] ?? null,
    removeItem: (key) => {
      map.delete(key);
    },
    setItem: (key, value) => {
      map.set(key, String(value));
    },
  };
}

beforeEach(() => {
  const storage = createMemoryStorage();
  vi.stubGlobal("localStorage", storage);
  vi.stubGlobal("window", {
    localStorage: storage,
    matchMedia: (query: string) =>
      ({
        matches: false,
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      }) as MediaQueryList,
  });
  vi.stubGlobal("navigator", {
    userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
    platform: "Win32",
    maxTouchPoints: 0,
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("isInstallDismissed", () => {
  it("returns false when nothing is stored", () => {
    expect(isInstallDismissed()).toBe(false);
  });

  it("returns true within the dismiss window", () => {
    const now = 1_700_000_000_000;
    dismissInstallPrompt(now);
    expect(isInstallDismissed(now + 1_000)).toBe(true);
  });

  it("returns false after the dismiss window expires", () => {
    const now = 1_700_000_000_000;
    dismissInstallPrompt(now);
    expect(isInstallDismissed(now + PWA_INSTALL_DISMISS_MS + 1)).toBe(false);
  });

  it("clears dismiss state", () => {
    dismissInstallPrompt();
    expect(localStorage.getItem(PWA_INSTALL_DISMISS_KEY)).not.toBeNull();
    clearInstallDismiss();
    expect(localStorage.getItem(PWA_INSTALL_DISMISS_KEY)).toBeNull();
  });
});

describe("isStandaloneDisplay", () => {
  it("detects standalone display-mode", () => {
    vi.stubGlobal("window", {
      localStorage,
      matchMedia: (query: string) =>
        ({
          matches: query.includes("display-mode: standalone"),
          media: query,
          onchange: null,
          addListener: vi.fn(),
          removeListener: vi.fn(),
          addEventListener: vi.fn(),
          removeEventListener: vi.fn(),
          dispatchEvent: vi.fn(),
        }) as MediaQueryList,
    });

    expect(isStandaloneDisplay()).toBe(true);
  });
});

describe("isIosDevice", () => {
  it("detects classic iPhone user agents", () => {
    vi.stubGlobal("navigator", {
      userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)",
      platform: "iPhone",
      maxTouchPoints: 5,
    });
    expect(isIosDevice()).toBe(true);
  });

  it("returns false for typical desktop Chrome", () => {
    expect(isIosDevice()).toBe(false);
  });
});
