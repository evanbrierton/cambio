import type { StorageAdapter } from "./types";

function createNoopStorage(): StorageAdapter {
  return {
    getItem: () => null,
    setItem: () => {},
    removeItem: () => {},
  };
}

export function createWebStorage(
  storage: Storage | null | undefined,
): StorageAdapter {
  if (!storage) return createNoopStorage();

  return {
    getItem(key) {
      try {
        return storage.getItem(key);
      } catch {
        return null;
      }
    },
    setItem(key, value) {
      try {
        storage.setItem(key, value);
      } catch {
        // Ignore quota / private-mode failures.
      }
    },
    removeItem(key) {
      try {
        storage.removeItem(key);
      } catch {
        // Ignore storage failures.
      }
    },
  };
}

export function createWebPersistentStorage(): StorageAdapter {
  if (typeof window === "undefined") return createNoopStorage();
  return createWebStorage(window.localStorage);
}

export function createWebSessionStorage(): StorageAdapter {
  if (typeof window === "undefined") return createNoopStorage();
  return createWebStorage(window.sessionStorage);
}

export function createMemoryStorage(
  initial: Record<string, string> = {},
): StorageAdapter {
  const map = new Map(Object.entries(initial));

  return {
    getItem(key) {
      return map.get(key) ?? null;
    },
    setItem(key, value) {
      map.set(key, value);
    },
    removeItem(key) {
      map.delete(key);
    },
  };
}
