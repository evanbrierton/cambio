const CHAT_STORAGE_KEY = "cambio-chat-notifications-enabled";
const EVENT_STORAGE_KEY = "cambio-event-notifications-enabled";

export function isChatNotificationsEnabled(): boolean {
  if (typeof window === "undefined") return true;
  return localStorage.getItem(CHAT_STORAGE_KEY) !== "0";
}

export function setChatNotificationsEnabled(enabled: boolean): void {
  localStorage.setItem(CHAT_STORAGE_KEY, enabled ? "1" : "0");
}

export function isEventNotificationsEnabled(): boolean {
  if (typeof window === "undefined") return true;
  return localStorage.getItem(EVENT_STORAGE_KEY) !== "0";
}

export function setEventNotificationsEnabled(enabled: boolean): void {
  localStorage.setItem(EVENT_STORAGE_KEY, enabled ? "1" : "0");
}
