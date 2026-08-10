export type SwapFlashSlot = { playerId: string; slot: number };

/** Ability swaps (Jack/Queen/King) always flash two slots; drawn-card hand swaps flash one. */
export function isAbilitySwapFlash(slots: SwapFlashSlot[]): boolean {
  return slots.length >= 2;
}

export function isHandTakeFlash(slots: SwapFlashSlot[]): boolean {
  return slots.length === 1;
}
