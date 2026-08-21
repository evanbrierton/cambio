type NativePluginMap = Record<string, unknown>;

type CapacitorRuntime = {
  isNativePlatform?: () => boolean;
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
};

function getCapacitorRuntime(): CapacitorRuntime | null {
  if (typeof window === "undefined") return null;
  return (window as WindowWithCapacitor).Capacitor ?? null;
}

function getNativePlugin<T>(name: string): T | null {
  const plugins = getCapacitorRuntime()?.Plugins;
  if (!plugins) return null;
  const plugin = plugins[name];
  if (!plugin) return null;
  return plugin as T;
}

export function isNativePlatform(): boolean {
  const runtime = getCapacitorRuntime();
  if (!runtime?.isNativePlatform) return false;
  return runtime.isNativePlatform();
}

export function canUseNativeShare(): boolean {
  if (!isNativePlatform()) return false;
  return Boolean(getNativePlugin<NativeSharePlugin>("Share")?.share);
}

export async function shareRoomInvite(params: {
  roomCode: string;
  roomUrl: string;
}): Promise<boolean> {
  if (!isNativePlatform()) return false;
  const share = getNativePlugin<NativeSharePlugin>("Share");
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
  const clipboard = getNativePlugin<NativeClipboardPlugin>("Clipboard");
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
  const haptics = getNativePlugin<NativeHapticsPlugin>("Haptics");
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
  return triggerNativeImpact("MEDIUM");
}
