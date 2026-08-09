"use client";

import { useEffect } from "react";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { type BotDifficulty, parseBotDifficulty } from "@/game/types";
import {
  clampBotCount,
  DEFAULT_BOT_SETTINGS,
  parseLegacyBotSettingsJson,
} from "@/lib/bot-settings";
import { PLAYER_NAME_KEY } from "@/lib/party";
import { parseUiPrefsPersistJson } from "@/store/ui-prefs-schema";

export type OwnSeatDisplay = "prominent" | "turn-order";

const PERSIST_KEY = "cambio-ui-prefs";

const LEGACY_KEYS = {
  sound: "cambio-sound-enabled",
  hints: "cambio-hints-enabled",
  chatNotifications: "cambio-chat-notifications-enabled",
  eventNotifications: "cambio-event-notifications-enabled",
  playerGrid: "cambio-player-grid-enabled",
  ownSeatDisplay: "cambio-own-seat-display",
  botSettings: "cambio-bot-settings",
} as const;

type UiPrefsData = {
  soundEnabled: boolean;
  hintsEnabled: boolean;
  chatNotificationsEnabled: boolean;
  eventNotificationsEnabled: boolean;
  playerGridEnabled: boolean;
  ownSeatDisplay: OwnSeatDisplay;
  playerName: string;
  botCount: number;
  botDifficulty: BotDifficulty;
};

type UiPrefsState = UiPrefsData & {
  hasHydrated: boolean;
  setHasHydrated: (hydrated: boolean) => void;
  setSoundEnabled: (enabled: boolean) => void;
  toggleSound: () => void;
  setHintsEnabled: (enabled: boolean) => void;
  toggleHints: () => void;
  setChatNotificationsEnabled: (enabled: boolean) => void;
  toggleChatNotifications: () => void;
  setEventNotificationsEnabled: (enabled: boolean) => void;
  toggleEventNotifications: () => void;
  setPlayerGridEnabled: (enabled: boolean) => void;
  togglePlayerGrid: () => void;
  setOwnSeatDisplay: (mode: OwnSeatDisplay) => void;
  toggleOwnSeatDisplay: () => void;
  setPlayerName: (name: string) => void;
  setBotCount: (count: number) => void;
  setBotDifficulty: (difficulty: BotDifficulty) => void;
};

const defaultPrefs: UiPrefsData = {
  soundEnabled: true,
  hintsEnabled: true,
  chatNotificationsEnabled: true,
  eventNotificationsEnabled: true,
  playerGridEnabled: false,
  ownSeatDisplay: "prominent",
  playerName: "",
  botCount: DEFAULT_BOT_SETTINGS.botCount,
  botDifficulty: DEFAULT_BOT_SETTINGS.difficulty,
};

function readLegacyBool(key: string, defaultEnabled: boolean): boolean {
  if (typeof window === "undefined") return defaultEnabled;
  const value = localStorage.getItem(key);
  if (value === null) return defaultEnabled;
  return value !== "0";
}

function readLegacyOwnSeatDisplay(): OwnSeatDisplay {
  if (typeof window === "undefined") return "prominent";
  return localStorage.getItem(LEGACY_KEYS.ownSeatDisplay) === "turn-order"
    ? "turn-order"
    : "prominent";
}

function readLegacyBotSettings(): Pick<
  UiPrefsData,
  "botCount" | "botDifficulty"
> {
  if (typeof window === "undefined") {
    return {
      botCount: DEFAULT_BOT_SETTINGS.botCount,
      botDifficulty: DEFAULT_BOT_SETTINGS.difficulty,
    };
  }

  try {
    const raw = localStorage.getItem(LEGACY_KEYS.botSettings);
    if (!raw) {
      return {
        botCount: DEFAULT_BOT_SETTINGS.botCount,
        botDifficulty: DEFAULT_BOT_SETTINGS.difficulty,
      };
    }

    const settings = parseLegacyBotSettingsJson(raw);
    return {
      botCount: settings.botCount,
      botDifficulty: settings.difficulty,
    };
  } catch {
    return {
      botCount: DEFAULT_BOT_SETTINGS.botCount,
      botDifficulty: DEFAULT_BOT_SETTINGS.difficulty,
    };
  }
}

function migrateLegacyPrefs(): UiPrefsData {
  const legacyBots = readLegacyBotSettings();
  return {
    soundEnabled: readLegacyBool(LEGACY_KEYS.sound, true),
    hintsEnabled: readLegacyBool(LEGACY_KEYS.hints, true),
    chatNotificationsEnabled: readLegacyBool(
      LEGACY_KEYS.chatNotifications,
      true,
    ),
    eventNotificationsEnabled: readLegacyBool(
      LEGACY_KEYS.eventNotifications,
      true,
    ),
    playerGridEnabled:
      typeof window !== "undefined" &&
      localStorage.getItem(LEGACY_KEYS.playerGrid) === "1",
    ownSeatDisplay: readLegacyOwnSeatDisplay(),
    playerName:
      typeof window !== "undefined"
        ? (localStorage.getItem(PLAYER_NAME_KEY) ?? "")
        : "",
    botCount: legacyBots.botCount,
    botDifficulty: legacyBots.botDifficulty,
  };
}

function readPersistedPrefs(): UiPrefsData | null {
  if (typeof window === "undefined") return null;

  const raw = localStorage.getItem(PERSIST_KEY);
  if (!raw) return null;

  try {
    const state = parseUiPrefsPersistJson(raw);
    if (!state) return null;
    return {
      ...defaultPrefs,
      ...state,
      botCount: clampBotCount(state.botCount ?? defaultPrefs.botCount),
      botDifficulty: parseBotDifficulty(state.botDifficulty ?? null),
    };
  } catch {
    return null;
  }
}

function hasLegacyPrefs(): boolean {
  if (typeof window === "undefined") return false;

  return (
    localStorage.getItem(LEGACY_KEYS.sound) !== null ||
    localStorage.getItem(LEGACY_KEYS.hints) !== null ||
    localStorage.getItem(LEGACY_KEYS.chatNotifications) !== null ||
    localStorage.getItem(LEGACY_KEYS.eventNotifications) !== null ||
    localStorage.getItem(LEGACY_KEYS.playerGrid) !== null ||
    localStorage.getItem(LEGACY_KEYS.ownSeatDisplay) !== null ||
    localStorage.getItem(LEGACY_KEYS.botSettings) !== null ||
    localStorage.getItem(PLAYER_NAME_KEY) !== null
  );
}

const customStorage = createJSONStorage<UiPrefsData>(() => ({
  getItem: () => {
    const persisted = readPersistedPrefs();
    if (persisted) {
      return JSON.stringify({ state: persisted, version: 0 });
    }
    if (hasLegacyPrefs()) {
      return JSON.stringify({ state: migrateLegacyPrefs(), version: 0 });
    }
    return null;
  },
  setItem: (_name, value) => {
    localStorage.setItem(PERSIST_KEY, value);
  },
  removeItem: (_name) => {
    localStorage.removeItem(PERSIST_KEY);
  },
}));

export const useUiPrefsStore = create<UiPrefsState>()(
  persist(
    (set, get) => ({
      ...defaultPrefs,
      hasHydrated: false,
      setHasHydrated: (hydrated) => set({ hasHydrated: hydrated }),
      setSoundEnabled: (enabled) => set({ soundEnabled: enabled }),
      toggleSound: () => set({ soundEnabled: !get().soundEnabled }),
      setHintsEnabled: (enabled) => set({ hintsEnabled: enabled }),
      toggleHints: () => set({ hintsEnabled: !get().hintsEnabled }),
      setChatNotificationsEnabled: (enabled) =>
        set({ chatNotificationsEnabled: enabled }),
      toggleChatNotifications: () =>
        set({ chatNotificationsEnabled: !get().chatNotificationsEnabled }),
      setEventNotificationsEnabled: (enabled) =>
        set({ eventNotificationsEnabled: enabled }),
      toggleEventNotifications: () =>
        set({ eventNotificationsEnabled: !get().eventNotificationsEnabled }),
      setPlayerGridEnabled: (enabled) => set({ playerGridEnabled: enabled }),
      togglePlayerGrid: () =>
        set({ playerGridEnabled: !get().playerGridEnabled }),
      setOwnSeatDisplay: (mode) => set({ ownSeatDisplay: mode }),
      toggleOwnSeatDisplay: () =>
        set({
          ownSeatDisplay:
            get().ownSeatDisplay === "prominent" ? "turn-order" : "prominent",
        }),
      setPlayerName: (name) => set({ playerName: name }),
      setBotCount: (count) => set({ botCount: clampBotCount(count) }),
      setBotDifficulty: (difficulty) =>
        set({ botDifficulty: parseBotDifficulty(difficulty) }),
    }),
    {
      name: PERSIST_KEY,
      storage: customStorage,
      skipHydration: true,
      partialize: (state) => ({
        soundEnabled: state.soundEnabled,
        hintsEnabled: state.hintsEnabled,
        chatNotificationsEnabled: state.chatNotificationsEnabled,
        eventNotificationsEnabled: state.eventNotificationsEnabled,
        playerGridEnabled: state.playerGridEnabled,
        ownSeatDisplay: state.ownSeatDisplay,
        playerName: state.playerName,
        botCount: state.botCount,
        botDifficulty: state.botDifficulty,
      }),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
    },
  ),
);

export function rehydrateUiPrefs(): void {
  void useUiPrefsStore.persist.rehydrate();
}

export function useRehydrateUiPrefs(): void {
  useEffect(() => {
    rehydrateUiPrefs();
  }, []);
}

export function useSoundEnabled() {
  const soundEnabled = useUiPrefsStore((state) => state.soundEnabled);
  const toggleSound = useUiPrefsStore((state) => state.toggleSound);
  return { soundEnabled, toggleSound };
}

export function useHintsEnabled() {
  const hintsEnabled = useUiPrefsStore((state) => state.hintsEnabled);
  const toggleHints = useUiPrefsStore((state) => state.toggleHints);
  return { hintsEnabled, toggleHints };
}

export function usePlayerGridEnabled() {
  const playerGridEnabled = useUiPrefsStore((state) => state.playerGridEnabled);
  const togglePlayerGrid = useUiPrefsStore((state) => state.togglePlayerGrid);
  return { playerGridEnabled, togglePlayerGrid };
}

export function useOwnSeatDisplay() {
  const ownSeatDisplay = useUiPrefsStore((state) => state.ownSeatDisplay);
  const toggleOwnSeatDisplay = useUiPrefsStore(
    (state) => state.toggleOwnSeatDisplay,
  );
  return {
    ownSeatDisplay,
    ownSeatProminent: ownSeatDisplay === "prominent",
    toggleOwnSeatDisplay,
  };
}

export function useNotificationPrefs() {
  const chatNotificationsEnabled = useUiPrefsStore(
    (state) => state.chatNotificationsEnabled,
  );
  const eventNotificationsEnabled = useUiPrefsStore(
    (state) => state.eventNotificationsEnabled,
  );
  const toggleChatNotifications = useUiPrefsStore(
    (state) => state.toggleChatNotifications,
  );
  const toggleEventNotifications = useUiPrefsStore(
    (state) => state.toggleEventNotifications,
  );
  return {
    chatNotificationsEnabled,
    eventNotificationsEnabled,
    toggleChatNotifications,
    toggleEventNotifications,
  };
}
