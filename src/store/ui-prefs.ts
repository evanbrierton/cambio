"use client";

import { useEffect } from "react";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { type BotDifficulty, parseBotDifficulty } from "@/game/types";
import { clampBotCount, DEFAULT_BOT_SETTINGS } from "@/lib/bot-settings";

export type OwnSeatDisplay = "prominent" | "turn-order";

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
  toggleSound: () => void;
  toggleHints: () => void;
  toggleChatNotifications: () => void;
  toggleEventNotifications: () => void;
  togglePlayerGrid: () => void;
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

function sanitizePersistedPrefs(persisted: unknown): Partial<UiPrefsData> {
  if (!persisted || typeof persisted !== "object") return {};

  const prefs = persisted as Partial<UiPrefsData>;
  return {
    ...prefs,
    botCount:
      prefs.botCount === undefined ? undefined : clampBotCount(prefs.botCount),
    botDifficulty:
      prefs.botDifficulty === undefined
        ? undefined
        : parseBotDifficulty(prefs.botDifficulty),
    ownSeatDisplay:
      prefs.ownSeatDisplay === "turn-order" ? "turn-order" : "prominent",
  };
}

export const useUiPrefsStore = create<UiPrefsState>()(
  persist(
    (set, get) => ({
      ...defaultPrefs,
      toggleSound: () => set({ soundEnabled: !get().soundEnabled }),
      toggleHints: () => set({ hintsEnabled: !get().hintsEnabled }),
      toggleChatNotifications: () =>
        set({ chatNotificationsEnabled: !get().chatNotificationsEnabled }),
      toggleEventNotifications: () =>
        set({ eventNotificationsEnabled: !get().eventNotificationsEnabled }),
      togglePlayerGrid: () =>
        set({ playerGridEnabled: !get().playerGridEnabled }),
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
      name: "cambio-ui-prefs",
      storage: createJSONStorage(() => localStorage),
      skipHydration: true,
      merge: (persisted, current) => ({
        ...current,
        ...sanitizePersistedPrefs(persisted),
      }),
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
    },
  ),
);

export function useRehydrateUiPrefs(): void {
  useEffect(() => {
    void useUiPrefsStore.persist.rehydrate();
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
