"use client";

import { useLayoutEffect, useRef } from "react";

/**
 * Fit a seat's hand inside the seat width by measuring the rendered hand and
 * applying `transform: scale(...)` when it would overflow.
 *
 * More reliable than precomputing card sizes from column counts: real gaps,
 * borders, and many penalty columns are all accounted for.
 *
 * Intended for grid view. Carousel seats inherit height-based sizing from
 * `.players-3d-stage` instead.
 */
export function useSeatHandFit(enabled: boolean, layoutKey: number | string) {
  const seatRef = useRef<HTMLElement>(null);
  const clipRef = useRef<HTMLDivElement>(null);
  const handRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    // Remeasure when hand composition changes (penalty count / hand length).
    void layoutKey;

    const seat = seatRef.current;
    const clip = clipRef.current;
    const hand = handRef.current;

    if (!enabled || !seat || !clip || !hand) {
      if (hand) {
        hand.style.transform = "";
        hand.style.transformOrigin = "";
      }
      if (clip) {
        clip.style.height = "";
      }
      return;
    }

    const update = () => {
      hand.style.transform = "none";
      clip.style.height = "auto";

      const seatStyles = getComputedStyle(seat);
      const padX =
        (Number.parseFloat(seatStyles.paddingLeft) || 0) +
        (Number.parseFloat(seatStyles.paddingRight) || 0);
      const available = Math.max(0, seat.clientWidth - padX);
      const naturalW = hand.scrollWidth;
      const naturalH = hand.scrollHeight;

      if (naturalW <= 0 || naturalH <= 0) {
        hand.style.transform = "";
        clip.style.height = "";
        return;
      }

      const scale = naturalW > available ? available / naturalW : 1;
      if (scale < 1) {
        hand.style.transform = `scale(${scale})`;
        hand.style.transformOrigin = "top center";
        clip.style.height = `${naturalH * scale}px`;
      } else {
        hand.style.transform = "";
        hand.style.transformOrigin = "";
        clip.style.height = "";
      }
    };

    update();
    const frame = requestAnimationFrame(update);
    const observer = new ResizeObserver(update);
    observer.observe(seat);
    observer.observe(hand);
    window.addEventListener("resize", update);

    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      window.removeEventListener("resize", update);
      hand.style.transform = "";
      hand.style.transformOrigin = "";
      clip.style.height = "";
    };
  }, [enabled, layoutKey]);

  return { seatRef, clipRef, handRef };
}
