import type { ClientPlatformAdapters } from "./types";
import { createWebClipboardAdapter } from "./web-clipboard";
import {
  createWebPersistentStorage,
  createWebSessionStorage,
} from "./web-storage";

let defaultAdapters: ClientPlatformAdapters | null = null;

export function createWebPlatformAdapters(): ClientPlatformAdapters {
  return {
    persistentStorage: createWebPersistentStorage(),
    sessionStorage: createWebSessionStorage(),
    clipboard: createWebClipboardAdapter(),
  };
}

export function getDefaultPlatformAdapters(): ClientPlatformAdapters {
  if (!defaultAdapters) {
    defaultAdapters = createWebPlatformAdapters();
  }
  return defaultAdapters;
}

export function setDefaultPlatformAdapters(
  adapters: ClientPlatformAdapters,
): void {
  defaultAdapters = adapters;
}

export * from "./types";
export * from "./web-clipboard";
export * from "./web-storage";
