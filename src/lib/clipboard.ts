import { getDefaultPlatformAdapters } from "@cambio/client";

export async function copyToClipboard(text: string): Promise<boolean> {
  return getDefaultPlatformAdapters().clipboard.copyText(text);
}
