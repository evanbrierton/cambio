"use client";

import { useLayoutEffect, useRef } from "react";

/**
 * Fit a seat's hand inside the seat clip by measuring the rendered hand and
 * scaling it to fill the available area (width + height), centered.
 *
 * A sized layout shell keeps the scaled hand's layout box matching its visual
 * size so it can be centered in the seat instead of collapsing to the top.
 *
 * Intended for grid view. Carousel seats inherit height-based sizing from
 * `.players-3d-stage` instead.
 */
export function useSeatHandFit(enabled: boolean, layoutKey: number | string) {
  const seatRef = useRef<HTMLElement>(null);
  const clipRef = useRef<HTMLDivElement>(null);
  const shellRef = useRef<HTMLDivElement>(null);
  const handRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    void layoutKey;

    const seat = seatRef.current;
    const clip = clipRef.current;
    const shell = shellRef.current;
    const hand = handRef.current;

    const clear = () => {
      if (hand) {
        hand.style.transform = "";
        hand.style.transformOrigin = "";
        hand.style.position = "";
        hand.style.left = "";
        hand.style.top = "";
      }
      if (shell) {
        shell.style.width = "";
        shell.style.height = "";
      }
    };

    if (!enabled || !seat || !clip || !shell || !hand) {
      clear();
      return;
    }

    const update = () => {
      hand.style.transform = "none";
      hand.style.position = "static";
      shell.style.width = "auto";
      shell.style.height = "auto";

      const naturalW = hand.scrollWidth;
      const naturalH = hand.scrollHeight;
      if (naturalW <= 0 || naturalH <= 0) {
        clear();
        return;
      }

      const availableW = Math.max(0, clip.clientWidth);
      const availableH = Math.max(0, clip.clientHeight || naturalH);
      if (availableW <= 0 || availableH <= 0) {
        clear();
        return;
      }

      const scale = Math.min(availableW / naturalW, availableH / naturalH);
      const visualW = naturalW * scale;
      const visualH = naturalH * scale;

      shell.style.width = `${visualW}px`;
      shell.style.height = `${visualH}px`;
      hand.style.position = "absolute";
      hand.style.left = "0";
      hand.style.top = "0";
      hand.style.transformOrigin = "top left";
      hand.style.transform =
        Math.abs(scale - 1) < 0.001 ? "" : `scale(${scale})`;
    };

    update();
    const frame = requestAnimationFrame(update);
    const observer = new ResizeObserver(update);
    observer.observe(seat);
    observer.observe(clip);
    window.addEventListener("resize", update);

    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      window.removeEventListener("resize", update);
      clear();
    };
  }, [enabled, layoutKey]);

  return { seatRef, clipRef, shellRef, handRef };
}
