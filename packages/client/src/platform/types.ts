export interface StorageAdapter {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export interface ClipboardAdapter {
  copyText(text: string): Promise<boolean>;
}

export interface ClientPlatformAdapters {
  persistentStorage: StorageAdapter;
  sessionStorage: StorageAdapter;
  clipboard: ClipboardAdapter;
}

export interface ThemePersistenceAdapter {
  getTheme(): string | null;
  setTheme(theme: string): void;
  getAppearance(): string | null;
  setAppearance(appearance: string): void;
}

export interface SoundGate {
  isSoundEnabled(): boolean;
}
