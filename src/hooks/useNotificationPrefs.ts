"use client";

import { useCallback, useEffect, useState } from "react";
import {
  isChatNotificationsEnabled,
  isEventNotificationsEnabled,
  setChatNotificationsEnabled,
  setEventNotificationsEnabled,
} from "@/lib/notifications";

export function useNotificationPrefs() {
  const [chatEnabled, setChatEnabled] = useState(true);
  const [eventEnabled, setEventEnabled] = useState(true);

  useEffect(() => {
    setChatEnabled(isChatNotificationsEnabled());
    setEventEnabled(isEventNotificationsEnabled());
  }, []);

  const toggleChatNotifications = useCallback(() => {
    setChatEnabled((prev) => {
      const next = !prev;
      setChatNotificationsEnabled(next);
      return next;
    });
  }, []);

  const toggleEventNotifications = useCallback(() => {
    setEventEnabled((prev) => {
      const next = !prev;
      setEventNotificationsEnabled(next);
      return next;
    });
  }, []);

  return {
    chatNotificationsEnabled: chatEnabled,
    eventNotificationsEnabled: eventEnabled,
    toggleChatNotifications,
    toggleEventNotifications,
  };
}
