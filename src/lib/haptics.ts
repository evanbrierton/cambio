import type { HapticKind } from "@cambio/client";
import type { SoundId } from "@/lib/sounds";

/**
 * Game-event haptics that pair with sounds. Snap and Cambio stay on the
 * table tap/flash path so a race-sensitive tap still buzzes immediately
 * without a second pulse from this map.
 */
export function hapticKindForSound(id: SoundId): HapticKind | null {
  switch (id) {
    case "snapWrong":
      return "error";
    case "yourTurn":
      return "medium";
    case "gameOver":
      return "success";
    case "swap":
      return "medium";
    case "snapWindowStart":
      return "warning";
    case "peek":
    case "spy":
    case "flip":
    case "take":
    case "reshuffle":
      return "light";
    case "snap":
    case "cambio":
    case "deckDraw":
    case "discardDraw":
    case "snapCountdown":
    case "click":
    case "chat":
      return null;
  }
}
