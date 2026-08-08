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
 * When an ancestor already defines `--seat-card-w` (carousel height scale),
 * that value is treated as a maximum so we only shrink further when needed.
 */
export function useSeatHandFit(columnCount: number) {
  const seatRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const seat = seatRef.current;
    if (!seat) return;

    const update = () => {
      const styles = getComputedStyle(seat);
      const padX =
        (Number.parseFloat(styles.paddingLeft) || 0) +
        (Number.parseFloat(styles.paddingRight) || 0);
      const available = Math.max(0, seat.clientWidth - padX);

      const parent = seat.parentElement;
      let maxFromParent = Number.POSITIVE_INFINITY;
      if (parent) {
        const parentW = Number.parseFloat(
          getComputedStyle(parent).getPropertyValue("--seat-card-w"),
        );
        if (!Number.isNaN(parentW) && parentW > 0) {
          maxFromParent = parentW;
        }
      }

      const maxCardW = Math.min(
        maxFromParent,
        maxSeatCardWidthForViewport(window.innerWidth),
      );
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
  }, [columnCount]);

  return seatRef;
}
