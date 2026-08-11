# Platform adapters (CAM-34)

Thin interfaces in `@cambio/client/platform` so web, Capacitor, and Expo can share client code without forking call sites.

## Storage

```typescript
interface StorageAdapter {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}
```

**Web:** `createWebPersistentStorage()` → `localStorage`, `createWebSessionStorage()` → `sessionStorage`.

**Capacitor (future):** `@capacitor/preferences` or secure storage plugin implementing the same interface. Inject via `setDefaultPlatformAdapters()` before React mount.

**Expo (future):** `expo-secure-store` for player IDs; AsyncStorage for prefs.

## Clipboard

```typescript
interface ClipboardAdapter {
  copyText(text: string): Promise<boolean>;
}
```

**Web:** `createWebClipboardAdapter()` — sync `execCommand` fallback, then `navigator.clipboard`.

**Native:** `@capacitor/clipboard` / `expo-clipboard` one-liner wrappers.

## Game connection

`useGameConnection(..., platform?)` accepts optional `ClientPlatformAdapters`. Defaults to web local/session storage.

Keys (from `@cambio/client/party`):

- `cambio-player-{roomId}` — persistent player ID for reconnect
- `cambio-fresh-{roomId}` — session marker after successful join

## Theme (web-only SSR path)

Theme/appearance cookies (`cambio-theme`, `cambio-appearance`) remain in `src/lib/theme-cookie.ts` for Next.js SSR bootstrap. Client updates go through `ThemeProvider` + `cookies-next`. Native shells will use storage adapter + in-app theme state instead of cookies.

## Sound prefs

Sound on/off lives in Zustand `ui-prefs` persisted through `createWebPersistentStorage()`. Procedural Web Audio in `src/lib/sounds.ts`; unlock via `useAudioUnlock` on first user gesture.
