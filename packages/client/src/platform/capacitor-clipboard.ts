import { copyWithNativeClipboard } from "./capacitor";
import type { ClipboardAdapter } from "./types";

export function createCapacitorClipboardAdapter(
  fallbackClipboard: ClipboardAdapter,
): ClipboardAdapter {
  return {
    async copyText(text: string): Promise<boolean> {
      const copied = await copyWithNativeClipboard(text);
      if (copied) return true;
      return fallbackClipboard.copyText(text);
    },
  };
}
