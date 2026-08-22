/** Mobile grid is 2 columns; at this count seats need vertical scroll into the chin. */
export const GRID_CHIN_FILL_MIN_PLAYERS = 5;

export function shouldFillPlayShellChin(options: {
  pageScrollable: boolean;
  playerGridEnabled: boolean;
  seatCount: number;
}): boolean {
  if (options.pageScrollable || !options.playerGridEnabled) return false;
  return options.seatCount >= GRID_CHIN_FILL_MIN_PLAYERS;
}
