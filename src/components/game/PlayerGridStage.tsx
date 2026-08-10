"use client";

import {
  Children,
  isValidElement,
  type ReactNode,
  useCallback,
  useEffect,
  useRef,
} from "react";

interface PlayerGridStageProps {
  children: ReactNode;
}

const GridItem = ({
  index,
  itemRefs,
  child,
}: {
  index: number;
  itemRefs: React.MutableRefObject<(HTMLDivElement | null)[]>;
  child: ReactNode;
}) => {
  const setRef = (element: HTMLDivElement | null) => {
    itemRefs.current[index] = element;
  };

  return (
    <div
      ref={setRef}
      className="players-grid-item min-w-0 w-full flex justify-center"
    >
      {child}
    </div>
  );
};

export const PlayerGridStage = ({ children }: PlayerGridStageProps) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<(HTMLDivElement | null)[]>([]);
  const childCount = Children.count(children);

  const updateLayout = useCallback(() => {
    const scrollEl = scrollRef.current;
    // Ref is null before mount; Biome treats RefObject.current as non-nullable.
    if (scrollEl === null) {
      return;
    }

    const reducedMotion = globalThis.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    const viewport = scrollEl.getBoundingClientRect();
    const centerY = viewport.top + viewport.height / 2;
    const halfH = Math.max(viewport.height / 2, 1);

    for (const item of itemRefs.current) {
      if (!item) {
        continue;
      }

      if (reducedMotion) {
        item.style.transform = "";
        item.style.opacity = "";
        continue;
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
    }
  }, []);

  useEffect(() => {
    itemRefs.current.length = childCount;
    const frame = requestAnimationFrame(updateLayout);
    return () => cancelAnimationFrame(frame);
  }, [childCount, updateLayout]);

  useEffect(() => {
    const scrollEl = scrollRef.current;
    if (scrollEl === null) {
      return;
    }

    const frame = requestAnimationFrame(updateLayout);

    scrollEl.addEventListener("scroll", updateLayout, { passive: true });
    globalThis.addEventListener("resize", updateLayout);

    const observer = new ResizeObserver(updateLayout);
    observer.observe(scrollEl);

    return () => {
      cancelAnimationFrame(frame);
      scrollEl.removeEventListener("scroll", updateLayout);
      globalThis.removeEventListener("resize", updateLayout);
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
          {Children.map(children, (child, index) => {
            const itemKey =
              isValidElement(child) && child.key !== null
                ? `grid-${String(child.key)}`
                : `grid-${index}`;
            return (
              <GridItem
                key={itemKey}
                index={index}
                itemRefs={itemRefs}
                child={child}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
};
