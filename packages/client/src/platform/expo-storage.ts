import type { StorageAdapter } from "./types";

export type AsyncStorageLike = {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
  getAllKeys(): Promise<readonly string[]>;
  multiGet(
    keys: readonly string[],
  ): Promise<readonly (readonly [string, string | null])[]>;
};

export type AsyncStorageAdapter = StorageAdapter & {
  hydrate(): Promise<void>;
};

function prefixKey(namespace: string, key: string): string {
  return `${namespace}:${key}`;
}

export function createAsyncStorageAdapter(
  storage: AsyncStorageLike,
  namespace = "cambio",
): AsyncStorageAdapter {
  const cache = new Map<string, string>();
  let hydrated = false;

  return {
    getItem(key) {
      return cache.get(key) ?? null;
    },
    setItem(key, value) {
      cache.set(key, value);
      void storage.setItem(prefixKey(namespace, key), value).catch(() => {});
    },
    removeItem(key) {
      cache.delete(key);
      void storage.removeItem(prefixKey(namespace, key)).catch(() => {});
    },
    async hydrate() {
      if (hydrated) return;
      const keys = await storage.getAllKeys();
      const scoped = keys.filter((key) => key.startsWith(`${namespace}:`));
      if (scoped.length === 0) {
        hydrated = true;
        return;
      }
      const pairs = await storage.multiGet(scoped);
      for (const [key, value] of pairs) {
        if (value == null) continue;
        cache.set(key.slice(namespace.length + 1), value);
      }
      hydrated = true;
    },
  };
}

export function createExpoSessionStorage(): StorageAdapter {
  const cache = new Map<string, string>();
  return {
    getItem(key) {
      return cache.get(key) ?? null;
    },
    setItem(key, value) {
      cache.set(key, value);
    },
    removeItem(key) {
      cache.delete(key);
    },
  };
}
