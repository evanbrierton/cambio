type NativePluginMap = Record<string, unknown>;

type CapacitorRuntime = {
  isNativePlatform?: () => boolean;
  getPlatform?: () => string;
  registerPlugin?: <T>(name: string) => T;
  nativePromise?: (
    pluginName: string,
    methodName: string,
    options?: unknown,
  ) => Promise<unknown>;
  isPluginAvailable?: (name: string) => boolean;
  Plugins?: NativePluginMap;
};

type WindowWithNativeBridge = Window & {
  Capacitor?: CapacitorRuntime;
  androidBridge?: unknown;
  webkit?: { messageHandlers?: { bridge?: unknown } };
};

const NATIVE_SHELL_BACKGROUND = "#12061f";

function getCapacitorWindow(): WindowWithNativeBridge | null {
  if (typeof window === "undefined") return null;
  return window as WindowWithNativeBridge;
}

function getCapacitorRuntime(): CapacitorRuntime | null {
  return getCapacitorWindow()?.Capacitor ?? null;
}

function getPluginMethod(
  pluginName: string,
  methodName: string,
): ((options?: unknown) => Promise<unknown>) | null {
  const plugin = getCapacitorRuntime()?.Plugins?.[pluginName];
  if (!plugin || typeof plugin !== "object") return null;
  const method = (plugin as Record<string, unknown>)[methodName];
  return typeof method === "function"
    ? (method as (options?: unknown) => Promise<unknown>).bind(plugin)
    : null;
}

/**
 * Capacitor's iOS/Android native-bridge.js exposes `nativePromise` and
 * JSExport plugin stubs. `registerPlugin` only exists if `@capacitor/core`
 * was bundled into the web app, which this remote-URL shell does not do.
 */
async function callNativePlugin(
  pluginName: string,
  methodName: string,
  options?: unknown,
): Promise<boolean> {
  if (!isNativePlatform()) return false;
  const runtime = getCapacitorRuntime();
  if (!runtime) return false;

  const direct = getPluginMethod(pluginName, methodName);
  if (direct) {
    try {
      await direct(options);
      return true;
    } catch {
      // Fall through to nativePromise / registerPlugin.
    }
  }

  if (typeof runtime.nativePromise === "function") {
    try {
      await runtime.nativePromise(pluginName, methodName, options);
      return true;
    } catch {
      // Fall through to registerPlugin for web-bundled Capacitor core.
    }
  }

  if (typeof runtime.registerPlugin !== "function") return false;
  try {
    const registered =
      runtime.registerPlugin<Record<string, unknown>>(pluginName);
    const method = registered?.[methodName];
    if (typeof method !== "function") return false;
    await (method as (options?: unknown) => Promise<unknown>).call(
      registered,
      options,
    );
    return true;
  } catch {
    return false;
  }
}

function hasNativePluginMethod(
  pluginName: string,
  methodName: string,
): boolean {
  if (!isNativePlatform()) return false;
  if (getPluginMethod(pluginName, methodName)) return true;

  const runtime = getCapacitorRuntime();
  if (!runtime) return false;
  if (
    typeof runtime.isPluginAvailable === "function" &&
    runtime.isPluginAvailable(pluginName)
  ) {
    return true;
  }
  if (typeof runtime.registerPlugin !== "function") return false;
  try {
    const registered =
      runtime.registerPlugin<Record<string, unknown>>(pluginName);
    return typeof registered?.[methodName] === "function";
  } catch {
    return false;
  }
}

export function isNativePlatform(): boolean {
  const win = getCapacitorWindow();
  if (!win) return false;

  const runtime = win.Capacitor;
  if (typeof runtime?.isNativePlatform === "function") {
    try {
      if (runtime.isNativePlatform()) return true;
    } catch {
      // Ignore and continue with other native signals.
    }
  }
  if (typeof runtime?.getPlatform === "function") {
    try {
      const platform = runtime.getPlatform();
      if (platform === "ios" || platform === "android") return true;
    } catch {
      // Ignore and continue with other native signals.
    }
  }

  return Boolean(win.webkit?.messageHandlers?.bridge || win.androidBridge);
}

export function markNativeShellClass(): boolean {
  if (typeof document === "undefined") return false;
  if (!isNativePlatform()) return false;
  document.documentElement.classList.add("native-shell");
  return true;
}

export function canUseNativeShare(): boolean {
  if (!isNativePlatform()) return false;
  if (hasNativePluginMethod("Share", "share")) return true;
  return canUseWebShare();
}

function canUseWebShare(): boolean {
  return (
    typeof navigator !== "undefined" && typeof navigator.share === "function"
  );
}

export async function shareRoomInvite(params: {
  roomCode: string;
  roomUrl: string;
}): Promise<boolean> {
  const title = `Join my Cambio game (${params.roomCode})`;
  const text = `Join my Cambio game: ${params.roomCode}`;
  const shared = await callNativePlugin("Share", "share", {
    title,
    text,
    url: params.roomUrl,
    dialogTitle: "Share invite",
  });
  if (shared) return true;
  if (!isNativePlatform() || !canUseWebShare()) return false;
  try {
    await navigator.share({ title, text, url: params.roomUrl });
    return true;
  } catch {
    return false;
  }
}

export async function copyWithNativeClipboard(text: string): Promise<boolean> {
  return callNativePlugin("Clipboard", "write", { string: text });
}

export type HapticKind =
  | "selection"
  | "light"
  | "medium"
  | "heavy"
  | "success"
  | "warning"
  | "error";

const IMPACT_STYLE = {
  light: "LIGHT",
  medium: "MEDIUM",
  heavy: "HEAVY",
} as const;

const NOTIFICATION_TYPE = {
  success: "SUCCESS",
  warning: "WARNING",
  error: "ERROR",
} as const;

const VIBRATE_MS: Record<HapticKind, number> = {
  selection: 10,
  light: 20,
  medium: 30,
  heavy: 50,
  success: 40,
  warning: 30,
  error: 50,
};

export async function triggerHaptic(kind: HapticKind): Promise<void> {
  if (kind === "selection") {
    const selected = await callNativePlugin("Haptics", "selectionChanged");
    if (selected) return;
    const impacted = await callNativePlugin("Haptics", "impact", {
      style: "LIGHT",
    });
    if (impacted) return;
    await callNativePlugin("Haptics", "vibrate", {
      duration: VIBRATE_MS.selection,
    });
    return;
  }

  if (kind === "success" || kind === "warning" || kind === "error") {
    const notified = await callNativePlugin("Haptics", "notification", {
      type: NOTIFICATION_TYPE[kind],
    });
    if (notified) return;
    const impacted = await callNativePlugin("Haptics", "impact", {
      style: kind === "error" ? "HEAVY" : "MEDIUM",
    });
    if (impacted) return;
    await callNativePlugin("Haptics", "vibrate", {
      duration: VIBRATE_MS[kind],
    });
    return;
  }

  const impacted = await callNativePlugin("Haptics", "impact", {
    style: IMPACT_STYLE[kind],
  });
  if (impacted) return;
  await callNativePlugin("Haptics", "vibrate", {
    duration: VIBRATE_MS[kind],
  });
}

export function hapticClick(kind: HapticKind = "selection"): void {
  void triggerHaptic(kind);
}

export async function triggerSnapHaptic(): Promise<void> {
  await triggerHaptic("light");
}

export async function triggerCambioHaptic(): Promise<void> {
  await triggerHaptic("success");
}

export async function applyNativeShellChrome(): Promise<void> {
  markNativeShellClass();
  if (!isNativePlatform()) return;

  await callNativePlugin("StatusBar", "setOverlaysWebView", { overlay: true });
  // Capacitor Style.Dark = light status-bar content on a dark background.
  await callNativePlugin("StatusBar", "setStyle", { style: "DARK" });
  await callNativePlugin("StatusBar", "setBackgroundColor", {
    color: NATIVE_SHELL_BACKGROUND,
  });
}
