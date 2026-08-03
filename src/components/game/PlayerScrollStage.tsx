"use client";

import {
  Children,
  isValidElement,
  type ReactNode,
  useCallback,
  useEffect,
  useRef,
} from "react";

type PlayerScrollStageProps = {
  children: ReactNode;
  centerIndex?: number;
};

export function PlayerScrollStage({
  children,
  centerIndex = 0,
}: PlayerScrollStageProps) {
  const railRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<(HTMLDivElement | null)[]>([]);
  const leadSpacerRef = useRef<HTMLDivElement>(null);
  const trailSpacerRef = useRef<HTMLDivElement>(null);
  const childCount = Children.count(children);

  const scrollToCenter = useCallback(
    (index: number, behavior: ScrollBehavior = "auto") => {
      const rail = railRef.current;
      const item = itemRefs.current[index];
      if (!rail || !item) return;

      const target =
        item.offsetLeft + item.offsetWidth / 2 - rail.clientWidth / 2;
      rail.scrollTo({ left: target, behavior });
    },
    [],
  );

  const updateLayout = useCallback(() => {
    const rail = railRef.current;
    if (!rail) return;

    const reducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    const centerItem = itemRefs.current[centerIndex];
    const itemHalf = centerItem ? centerItem.offsetWidth / 2 : 58;
    const spacerWidth = Math.max(16, rail.clientWidth / 2 - itemHalf);

    if (leadSpacerRef.current) {
      leadSpacerRef.current.style.width = `${spacerWidth}px`;
    }
    if (trailSpacerRef.current) {
      trailSpacerRef.current.style.width = `${spacerWidth}px`;
    }

    const railRect = rail.getBoundingClientRect();
    const center = railRect.left + railRect.width / 2;

    itemRefs.current.forEach((item) => {
      if (!item) return;

      if (reducedMotion) {
        item.style.transform = "";
        item.style.opacity = "";
        return;
      }

      const rect = item.getBoundingClientRect();
      const itemCenter = rect.left + rect.width / 2;
      const offset = (itemCenter - center) / Math.max(railRect.width, 1);
      const clamped = Math.max(-1, Math.min(1, offset));
      const rotateY = clamped * -28;
      const scale = 1 - Math.abs(clamped) * 0.1;
      const translateZ = (1 - Math.abs(clamped)) * 24;

      item.style.transform = `rotateY(${rotateY}deg) scale(${scale}) translateZ(${translateZ}px)`;
      item.style.opacity = String(1 - Math.abs(clamped) * 0.28);
    });
  }, [centerIndex]);

  useEffect(() => {
    itemRefs.current.length = childCount;
  }, [childCount]);

  useEffect(() => {
    const rail = railRef.current;
    if (!rail) return;

    const frame = requestAnimationFrame(() => {
      updateLayout();
      requestAnimationFrame(() => scrollToCenter(centerIndex));
    });

    rail.addEventListener("scroll", updateLayout, { passive: true });
    window.addEventListener("resize", updateLayout);

    const observer = new ResizeObserver(() => {
      updateLayout();
      scrollToCenter(centerIndex);
    });
    observer.observe(rail);

    return () => {
      cancelAnimationFrame(frame);
      rail.removeEventListener("scroll", updateLayout);
      window.removeEventListener("resize", updateLayout);
      observer.disconnect();
    };
  }, [centerIndex, scrollToCenter, updateLayout]);

  return (
    <div className="players-3d-stage">
      <div ref={railRef} className="players-3d-rail">
        <div
          key="spacer-lead"
          ref={leadSpacerRef}
          className="players-3d-spacer"
          aria-hidden
        />
        {Children.map(children, (child, index) => (
          <div
            key={
              isValidElement(child) && child.key != null
                ? `stage-${String(child.key)}`
                : `stage-${index}`
            }
            ref={(element) => {
              itemRefs.current[index] = element;
            }}
            className="players-3d-item"
          >
            {child}
          </div>
        ))}
        <div
          key="spacer-trail"
          ref={trailSpacerRef}
          className="players-3d-spacer"
          aria-hidden
        />
      </div>
    </div>
  );
}
