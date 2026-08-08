"use client";

import { useEffect, useRef } from "react";
import {
  computeSeatHandSize,
  maxSeatCardWidthForViewport,
} from "@/lib/seat-hand-scale";

/**
 * Fit a seat's hand (2×2 base + penalty columns) inside the seat width by
 * setting `--seat-card-*` CSS variables on the seat element.
 *
 * Intended for grid view. Carousel seats should inherit height-based sizing
 * from `.players-3d-stage` instead of overriding it here.
 */
export function useSeatHandFit(columnCount: number, enabled: boolean) {
  const seatRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const seat = seatRef.current;
    if (!seat || !enabled) return;

    const update = () => {
      const styles = getComputedStyle(seat);
      const padX =
        (Number.parseFloat(styles.paddingLeft) || 0) +
        (Number.parseFloat(styles.paddingRight) || 0);
      const available = Math.max(0, seat.clientWidth - padX);
      const maxCardW = maxSeatCardWidthForViewport(window.innerWidth);
      const { cardW, cardH, handW, fontSize } = computeSeatHandSize(
        available,
        columnCount,
        maxCardW,
      );

      seat.style.setProperty("--seat-card-w", `${cardW}px`);
      seat.style.setProperty("--seat-card-h", `${cardH}px`);
      seat.style.setProperty("--seat-hand-w", `${handW}px`);
      seat.style.setProperty("--seat-card-fs", `${fontSize}px`);
    };

    update();
    const frame = requestAnimationFrame(update);
    const observer = new ResizeObserver(update);
    observer.observe(seat);
    window.addEventListener("resize", update);

    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      window.removeEventListener("resize", update);
      seat.style.removeProperty("--seat-card-w");
      seat.style.removeProperty("--seat-card-h");
      seat.style.removeProperty("--seat-hand-w");
      seat.style.removeProperty("--seat-card-fs");
    };
  }, [columnCount, enabled]);

  return seatRef;
}
