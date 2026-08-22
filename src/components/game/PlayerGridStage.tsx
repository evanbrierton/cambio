"use client";

import {
  Children,
  isValidElement,
  type ReactNode,
  useCallback,
  useEffect,
  useRef,
} from "react";

type PlayerGridStageProps = {
  children: ReactNode;
};

export function PlayerGridStage({ children }: PlayerGridStageProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<(HTMLDivElement | null)[]>([]);
  const childCount = Children.count(children);
  const scrollRafRef = useRef(0);
  const resizeRafRef = useRef(0);

  const applyScrollTransforms = useCallback(() => {
    const scrollEl = scrollRef.current;
    if (!scrollEl) return;

    const reducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    const viewport = scrollEl.getBoundingClientRect();
    const centerY = viewport.top + viewport.height / 2;
    const halfH = Math.max(viewport.height / 2, 1);

    itemRefs.current.forEach((item) => {
      if (!item) return;

      if (reducedMotion) {
        item.style.transform = "";
        item.style.opacity = "";
        return;
      }

      const rect = item.getBoundingClientRect();
      const offsetY = (rect.top + rect.height / 2 - centerY) / halfH;
      const clampedY = Math.max(-1, Math.min(1, offsetY));
      const dist = Math.abs(clampedY);

      // Vertical scroll only — skip rotateY so side columns stay upright.
      const rotateX = clampedY * 2;
      const scale = 1 - dist * 0.02;
      const translateZ = (1 - dist) * 4;
      const opacity = 1 - dist * 0.05;

      item.style.transform = `rotateX(${rotateX}deg) scale(${scale}) translateZ(${translateZ}px)`;
      item.style.opacity = String(opacity);
    });
  }, []);

  const updateFillHeight = useCallback(() => {
    const scrollEl = scrollRef.current;
    const gridEl = gridRef.current;
    if (!scrollEl) return;

    const fillHeight = Math.max(scrollEl.clientHeight, 0);
    if (gridEl && fillHeight > 0) {
      gridEl.style.minHeight = `${fillHeight}px`;
    }

    applyScrollTransforms();
  }, [applyScrollTransforms]);

  const scheduleScrollTransforms = useCallback(() => {
    if (scrollRafRef.current) return;
    scrollRafRef.current = requestAnimationFrame(() => {
      scrollRafRef.current = 0;
      applyScrollTransforms();
    });
  }, [applyScrollTransforms]);

  const scheduleFillHeight = useCallback(() => {
    if (resizeRafRef.current) return;
    resizeRafRef.current = requestAnimationFrame(() => {
      resizeRafRef.current = 0;
      updateFillHeight();
    });
  }, [updateFillHeight]);

  useEffect(() => {
    itemRefs.current.length = childCount;
    const frame = requestAnimationFrame(updateFillHeight);
    return () => cancelAnimationFrame(frame);
  }, [childCount, updateFillHeight]);

  useEffect(() => {
    const scrollEl = scrollRef.current;
    if (!scrollEl) return;

    const frame = requestAnimationFrame(updateFillHeight);

    scrollEl.addEventListener("scroll", scheduleScrollTransforms, {
      passive: true,
    });
    window.addEventListener("resize", scheduleFillHeight);

    const observer = new ResizeObserver(scheduleFillHeight);
    observer.observe(scrollEl);

    return () => {
      cancelAnimationFrame(frame);
      if (scrollRafRef.current) cancelAnimationFrame(scrollRafRef.current);
      if (resizeRafRef.current) cancelAnimationFrame(resizeRafRef.current);
      scrollRafRef.current = 0;
      resizeRafRef.current = 0;
      scrollEl.removeEventListener("scroll", scheduleScrollTransforms);
      window.removeEventListener("resize", scheduleFillHeight);
      observer.disconnect();
    };
  }, [scheduleFillHeight, scheduleScrollTransforms, updateFillHeight]);

  return (
    <div className="players-grid-stage">
      <div ref={scrollRef} className="players-grid-scroll">
        <div
          ref={gridRef}
          className="players-grid grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-2 xl:grid-cols-3 gap-3 px-2 pt-2 pb-0 justify-items-stretch items-stretch"
        >
          {Children.map(children, (child, index) => (
            <div
              key={
                isValidElement(child) && child.key != null
                  ? `grid-${String(child.key)}`
                  : `grid-${index}`
              }
              ref={(element) => {
                itemRefs.current[index] = element;
              }}
              className="players-grid-item min-w-0 w-full h-full min-h-0 flex justify-center items-stretch"
            >
              {child}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
