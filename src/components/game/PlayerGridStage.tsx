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
  const itemRefs = useRef<(HTMLDivElement | null)[]>([]);
  const childCount = Children.count(children);

  const updateLayout = useCallback(() => {
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

  useEffect(() => {
    itemRefs.current.length = childCount;
    const frame = requestAnimationFrame(updateLayout);
    return () => cancelAnimationFrame(frame);
  }, [childCount, updateLayout]);

  useEffect(() => {
    const scrollEl = scrollRef.current;
    if (!scrollEl) return;

    const frame = requestAnimationFrame(updateLayout);

    scrollEl.addEventListener("scroll", updateLayout, { passive: true });
    window.addEventListener("resize", updateLayout);

    const observer = new ResizeObserver(updateLayout);
    observer.observe(scrollEl);

    return () => {
      cancelAnimationFrame(frame);
      scrollEl.removeEventListener("scroll", updateLayout);
      window.removeEventListener("resize", updateLayout);
      observer.disconnect();
    };
  }, [updateLayout]);

  return (
    <div className="players-grid-stage flex flex-1 flex-col min-h-0 min-w-0 overflow-hidden">
      <div
        ref={scrollRef}
        className="players-grid-scroll flex-1 basis-0 min-h-0 overflow-y-auto overflow-x-auto overscroll-contain [-webkit-overflow-scrolling:touch]"
      >
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-2 xl:grid-cols-3 gap-3 p-2 justify-items-center">
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
              className="players-grid-item min-w-0 w-full flex justify-center"
            >
              {child}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
