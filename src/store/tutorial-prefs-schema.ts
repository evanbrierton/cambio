import { z } from "zod";

export const tutorialPrefsPersistStateSchema = z
  .object({
    homeSeen: z.boolean().optional(),
    gameSeen: z.boolean().optional(),
  })
  .passthrough();

export const tutorialPrefsPersistBlobSchema = z
  .object({
    state: tutorialPrefsPersistStateSchema.optional(),
    version: z.number().optional(),
  })
  .passthrough();

export type TutorialPrefsPersistState = z.infer<
  typeof tutorialPrefsPersistStateSchema
>;

export function parseTutorialPrefsPersistBlob(
  raw: unknown,
): TutorialPrefsPersistState | null {
  const result = tutorialPrefsPersistBlobSchema.safeParse(raw);
  if (!result.success || !result.data.state) return null;
  return result.data.state;
}

export function parseTutorialPrefsPersistJson(
  raw: string,
): TutorialPrefsPersistState | null {
  try {
    return parseTutorialPrefsPersistBlob(JSON.parse(raw));
  } catch {
    return null;
  }
}
