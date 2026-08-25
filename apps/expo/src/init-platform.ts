import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Clipboard from "expo-clipboard";
import {
  createExpoPlatformAdapters,
  setDefaultPlatformAdapters,
} from "@cambio/client/platform";

let initPromise: Promise<void> | null = null;

export function initExpoPlatform(): Promise<void> {
  if (!initPromise) {
    const adapters = createExpoPlatformAdapters({
      asyncStorage: AsyncStorage,
      clipboard: Clipboard,
    });
    initPromise = adapters.ready.then(() => {
      setDefaultPlatformAdapters(adapters);
    });
  }
  return initPromise!;
}
