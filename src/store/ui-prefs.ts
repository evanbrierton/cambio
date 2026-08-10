"use client";

import { useEffect } from "react";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { useShallow } from "zustand/react/shallow";
import { type BotDifficulty, parseBotDifficulty } from "@/game/types";
import { clampBotCount, DEFAULT_BOT_SETTINGS } from "@/lib/bot-settings";
import { uiPrefsPersistStateSchema } from "@/store/ui-prefs-schema";

export type OwnSeatDisplay = "prominent" | "turn-order";

interface UiPrefsData {
  soundEnabled: boolean;
  hintsEnabled: boolean;
  chatNotificationsEnabled: boolean;
  eventNotificationsEnabled: boolean;
  playerGridEnabled: boolean;
  ownSeatDisplay: OwnSeatDisplay;
  playerName: string;
  botCount: number;
  botDifficulty: BotDifficulty;
}

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
  const result = uiPrefsPersistStateSchema.safeParse(persisted);
  if (!result.success) {
    return {};
  }

  const prefs = result.data;
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
    const result = useUiPrefsStore.persist.rehydrate();
    if (result instanceof Promise) {
      result.then(
        () => undefined,
        () => undefined,
      );
    }
  }, []);
}

export function useUiPrefs() {
  return useUiPrefsStore(
    useShallow((state) => ({
      soundEnabled: state.soundEnabled,
      toggleSound: state.toggleSound,
      hintsEnabled: state.hintsEnabled,
      toggleHints: state.toggleHints,
      chatNotificationsEnabled: state.chatNotificationsEnabled,
      eventNotificationsEnabled: state.eventNotificationsEnabled,
      toggleChatNotifications: state.toggleChatNotifications,
      toggleEventNotifications: state.toggleEventNotifications,
      playerGridEnabled: state.playerGridEnabled,
      togglePlayerGrid: state.togglePlayerGrid,
      ownSeatDisplay: state.ownSeatDisplay,
      ownSeatProminent: state.ownSeatDisplay === "prominent",
      toggleOwnSeatDisplay: state.toggleOwnSeatDisplay,
      playerName: state.playerName,
      setPlayerName: state.setPlayerName,
      botCount: state.botCount,
      setBotCount: state.setBotCount,
      botDifficulty: state.botDifficulty,
      setBotDifficulty: state.setBotDifficulty,
    })),
  );
}
