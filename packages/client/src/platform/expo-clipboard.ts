import type { ClipboardAdapter } from "./types";

export type ExpoClipboardLike = {
  setStringAsync(text: string): Promise<boolean | void>;
};

export function createExpoClipboardAdapter(
  clipboard: ExpoClipboardLike,
): ClipboardAdapter {
  return {
    async copyText(text: string): Promise<boolean> {
      try {
        await clipboard.setStringAsync(text);
        return true;
      } catch {
        return false;
      }
    },
  };
}
