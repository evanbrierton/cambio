import { createExpoClipboardAdapter, type ExpoClipboardLike } from "./expo-clipboard";
import {
  createAsyncStorageAdapter,
  createExpoSessionStorage,
  type AsyncStorageLike,
} from "./expo-storage";
import type { ClientPlatformAdapters } from "./types";

export type ExpoPlatformModules = {
  asyncStorage: AsyncStorageLike;
  clipboard: ExpoClipboardLike;
};

export type ExpoPlatformAdapters = ClientPlatformAdapters & {
  ready: Promise<void>;
};

export function createExpoPlatformAdapters(
  modules: ExpoPlatformModules,
): ExpoPlatformAdapters {
  const persistentStorage = createAsyncStorageAdapter(modules.asyncStorage);
  const sessionStorage = createExpoSessionStorage();
  const clipboard = createExpoClipboardAdapter(modules.clipboard);

  return {
    persistentStorage,
    sessionStorage,
    clipboard,
    ready: persistentStorage.hydrate(),
  };
}
