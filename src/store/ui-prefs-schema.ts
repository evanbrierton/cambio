import { z } from "zod";

export const uiPrefsPersistStateSchema = z
  .object({
    soundEnabled: z.boolean().optional(),
    hintsEnabled: z.boolean().optional(),
    chatNotificationsEnabled: z.boolean().optional(),
    eventNotificationsEnabled: z.boolean().optional(),
    playerGridEnabled: z.boolean().optional(),
    ownSeatDisplay: z.enum(["prominent", "turn-order"]).optional(),
    playerName: z.string().optional(),
    botCount: z.number().optional(),
    botDifficulty: z.enum(["easy", "medium", "hard"]).optional(),
  })
  .passthrough();

export const uiPrefsPersistBlobSchema = z
  .object({
    state: uiPrefsPersistStateSchema.optional(),
    version: z.number().optional(),
  })
  .passthrough();

export type UiPrefsPersistState = z.infer<typeof uiPrefsPersistStateSchema>;

export function parseUiPrefsPersistBlob(
  raw: unknown,
): UiPrefsPersistState | null {
  const result = uiPrefsPersistBlobSchema.safeParse(raw);
  if (!result.success || !result.data.state) return null;
  return result.data.state;
}

export function parseUiPrefsPersistJson(
  raw: string,
): UiPrefsPersistState | null {
  try {
    return parseUiPrefsPersistBlob(JSON.parse(raw));
  } catch {
    return null;
  }
}
