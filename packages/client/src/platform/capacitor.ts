type NativePluginMap = Record<string, unknown>;

type CapacitorRuntime = {
  isNativePlatform?: () => boolean;
  registerPlugin?: <T>(name: string) => T;
  Plugins?: NativePluginMap;
};

type WindowWithCapacitor = Window & {
  Capacitor?: CapacitorRuntime;
};

type NativeSharePlugin = {
  share: (options: {
    title?: string;
    text?: string;
    url?: string;
    dialogTitle?: string;
  }) => Promise<unknown>;
};

type NativeClipboardPlugin = {
  write: (options: { string: string }) => Promise<unknown>;
};

type NativeHapticsPlugin = {
  impact: (options: {
    style: "LIGHT" | "MEDIUM" | "HEAVY";
  }) => Promise<unknown>;
  notification?: (options: {
    type: "SUCCESS" | "WARNING" | "ERROR";
  }) => Promise<unknown>;
};

type NativeStatusBarPlugin = {
  setOverlaysWebView?: (options: { overlay: boolean }) => Promise<unknown>;
  setStyle?: (options: {
    style: "DARK" | "LIGHT" | "DEFAULT";
  }) => Promise<unknown>;
  setBackgroundColor?: (options: { color: string }) => Promise<unknown>;
};

function getCapacitorRuntime(): CapacitorRuntime | null {
  if (typeof window === "undefined") return null;
  return (window as WindowWithCapacitor).Capacitor ?? null;
}

function getOrRegisterPlugin<T>(name: string): T | null {
  const runtime = getCapacitorRuntime();
  if (!runtime) return null;

  const existing = runtime.Plugins?.[name];
  if (existing) return existing as T;

  if (typeof runtime.registerPlugin !== "function") return null;
  try {
    const registered = runtime.registerPlugin<T>(name);
    if (runtime.Plugins && registered && !runtime.Plugins[name]) {
      runtime.Plugins[name] = registered;
    }
    return registered ?? null;
  } catch {
    return null;
  }
}

export function isNativePlatform(): boolean {
  const runtime = getCapacitorRuntime();
  if (!runtime?.isNativePlatform) return false;
  return runtime.isNativePlatform();
}

export function canUseNativeShare(): boolean {
  if (!isNativePlatform()) return false;
  return Boolean(getOrRegisterPlugin<NativeSharePlugin>("Share")?.share);
}

export async function shareRoomInvite(params: {
  roomCode: string;
  roomUrl: string;
}): Promise<boolean> {
  if (!isNativePlatform()) return false;
  const share = getOrRegisterPlugin<NativeSharePlugin>("Share");
  if (!share?.share) return false;
  try {
    await share.share({
      title: `Join my Cambio game (${params.roomCode})`,
      text: `Join my Cambio game: ${params.roomCode}`,
      url: params.roomUrl,
      dialogTitle: "Share invite",
    });
    return true;
  } catch {
    return false;
  }
}

export async function copyWithNativeClipboard(text: string): Promise<boolean> {
  if (!isNativePlatform()) return false;
  const clipboard = getOrRegisterPlugin<NativeClipboardPlugin>("Clipboard");
  if (!clipboard?.write) return false;
  try {
    await clipboard.write({ string: text });
    return true;
  } catch {
    return false;
  }
}

async function triggerNativeImpact(style: "LIGHT" | "MEDIUM" | "HEAVY") {
  if (!isNativePlatform()) return;
  const haptics = getOrRegisterPlugin<NativeHapticsPlugin>("Haptics");
  if (!haptics?.impact) return;
  try {
    await haptics.impact({ style });
  } catch {
    // Ignore plugin errors so web/native fallbacks stay unchanged.
  }
}

export function triggerSnapHaptic(): Promise<void> {
  return triggerNativeImpact("LIGHT");
}

export function triggerCambioHaptic(): Promise<void> {
  if (!isNativePlatform()) return Promise.resolve();
  const haptics = getOrRegisterPlugin<NativeHapticsPlugin>("Haptics");
  if (!haptics) return Promise.resolve();

  return (async () => {
    try {
      if (haptics.notification) {
        await haptics.notification({ type: "SUCCESS" });
        return;
      }
    } catch {
      // Fall through to impact if notification is unavailable.
    }
    await triggerNativeImpact("MEDIUM");
  })();
}

export async function applyNativeShellChrome(): Promise<void> {
  if (!isNativePlatform()) return;
  const statusBar = getOrRegisterPlugin<NativeStatusBarPlugin>("StatusBar");
  if (!statusBar) return;

  try {
    await statusBar.setOverlaysWebView?.({ overlay: true });
  } catch {
    // Keep going so style/background still apply on older plugin builds.
  }
  try {
    await statusBar.setStyle?.({ style: "LIGHT" });
  } catch {
    // Ignore plugin errors so web/native fallbacks stay unchanged.
  }
  try {
    await statusBar.setBackgroundColor?.({ color: "#12061f" });
  } catch {
    // Ignore plugin errors so web/native fallbacks stay unchanged.
  }
}
