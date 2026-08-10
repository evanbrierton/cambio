"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ChatMessage } from "@/game/types";
import { playSound } from "@/lib/sounds";

const CHAT_TOAST_MS = 4000;
const MOBILE_MEDIA_QUERY = "(max-width: 1023px)";

export interface ChatNotification {
  id: string;
  playerName: string;
  text: string;
}

function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) {
    return text;
  }
  return `${text.slice(0, maxLength - 1)}…`;
}

export function useChatNotifications({
  messages,
  playerId,
  settingsOpen,
  soundEnabled,
  notificationsEnabled = true,
}: {
  messages: ChatMessage[];
  playerId: string;
  settingsOpen: boolean;
  soundEnabled: boolean;
  notificationsEnabled?: boolean;
}) {
  const [lastSeenId, setLastSeenId] = useState<string | null>(null);
  const [notification, setNotification] = useState<ChatNotification | null>(
    null,
  );
  const isMobileRef = useRef(false);
  const lastNotifiedIdRef = useRef<string | null>(null);
  const notificationTimerRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );

  const dismissNotification = useCallback(() => {
    setNotification(null);
    if (notificationTimerRef.current) {
      globalThis.clearTimeout(notificationTimerRef.current);
      notificationTimerRef.current = null;
    }
  }, []);

  useEffect(() => {
    const mediaQuery = globalThis.matchMedia(MOBILE_MEDIA_QUERY);
    const update = () => {
      isMobileRef.current = mediaQuery.matches;
    };
    update();
    mediaQuery.addEventListener("change", update);
    return () => mediaQuery.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    if (lastSeenId !== null) {
      return;
    }
    const latest = messages.at(-1);
    if (latest) {
      setLastSeenId(latest.id);
    }
  }, [messages, lastSeenId]);

  useEffect(() => {
    if (!settingsOpen) {
      return;
    }
    const latest = messages.at(-1);
    if (latest) {
      setLastSeenId(latest.id);
    }
    dismissNotification();
  }, [settingsOpen, messages, dismissNotification]);

  useEffect(() => {
    if (notificationsEnabled) {
      return;
    }
    dismissNotification();
  }, [notificationsEnabled, dismissNotification]);

  const unreadCount = useMemo(() => {
    if (lastSeenId === null) {
      return 0;
    }
    const lastSeenIndex = messages.findIndex(
      (message) => message.id === lastSeenId,
    );
    const unread =
      lastSeenIndex === -1 ? messages : messages.slice(lastSeenIndex + 1);
    return unread.filter((message) => message.playerId !== playerId).length;
  }, [messages, lastSeenId, playerId]);

  useEffect(() => {
    if (
      lastSeenId === null ||
      settingsOpen ||
      !isMobileRef.current ||
      !notificationsEnabled
    ) {
      return;
    }

    const lastSeenIndex = messages.findIndex(
      (message) => message.id === lastSeenId,
    );
    const incoming = (
      lastSeenIndex === -1 ? messages : messages.slice(lastSeenIndex + 1)
    ).filter((message) => message.playerId !== playerId);
    const latest = incoming.at(-1);
    if (!latest || latest.id === lastNotifiedIdRef.current) {
      return;
    }

    lastNotifiedIdRef.current = latest.id;
    if (soundEnabled) {
      playSound("chat");
    }

    setNotification({
      id: latest.id,
      playerName: latest.playerName,
      text: truncateText(latest.text, 80),
    });

    if (notificationTimerRef.current) {
      globalThis.clearTimeout(notificationTimerRef.current);
    }
    notificationTimerRef.current = globalThis.setTimeout(() => {
      setNotification(null);
      notificationTimerRef.current = null;
    }, CHAT_TOAST_MS);
  }, [
    messages,
    lastSeenId,
    settingsOpen,
    playerId,
    soundEnabled,
    notificationsEnabled,
  ]);

  useEffect(
    () => () => {
      if (notificationTimerRef.current) {
        globalThis.clearTimeout(notificationTimerRef.current);
      }
    },
    [],
  );

  return { unreadCount, notification, dismissNotification };
}
