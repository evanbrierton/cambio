import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * CAM-75 verifier: swap overlay uses gold/violet palette distinct from cyan draw peek flash.
 */
describe("CAM-75 VFX differentiation", () => {
  const swapOverlay = readFileSync(
    join(process.cwd(), "src/components/game/SwapFlashOverlay.tsx"),
    "utf8",
  );
  const pixelCard = readFileSync(
    join(process.cwd(), "src/components/cards/PixelCard.tsx"),
    "utf8",
  );
  const globalsCss = readFileSync(
    join(process.cwd(), "src/app/globals.css"),
    "utf8",
  );

  it("SwapFlashOverlay uses dedicated swap palette classes", () => {
    expect(swapOverlay).toMatch(/swap-flash-overlay/);
    expect(swapOverlay).toMatch(/bg-swap-flash-base/);
    expect(swapOverlay).toMatch(/border-swap-flash-a/);
    expect(swapOverlay).toMatch(/border-swap-flash-b/);
    expect(swapOverlay).toMatch(/swap-flash-arc/);
    expect(swapOverlay).toMatch(/⇄/);
    expect(swapOverlay).toMatch(/SWAP/);
  });

  it("PixelCard imports SwapFlashOverlay and uses swap-flash-wrap for swap state", () => {
    expect(pixelCard).toMatch(/SwapFlashOverlay/);
    expect(pixelCard).toMatch(/swap-flash-wrap/);
    expect(pixelCard).toMatch(/swapFlashing/);
  });

  it("draw/peek flash remains accent-alt cyan while swap uses gold/violet tokens", () => {
    expect(pixelCard).toMatch(/bg-accent-alt/);
    expect(globalsCss).toMatch(/--swap-flash-a: #ffb020/);
    expect(globalsCss).toMatch(/--swap-flash-b: #a855f7/);
    expect(globalsCss).toMatch(/\.swap-seat-flash/);
    expect(globalsCss).toMatch(/\.peek-flash-wrap/);
  });
});
