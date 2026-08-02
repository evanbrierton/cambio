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

const MAX_ROTATE_Y = 44;
const MIN_SCALE = 0.78;
const MIN_OPACITY = 0.48;
const MAX_TRANSLATE_Z = 36;

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

    const centerItem = itemRefs.current[centerIndex];
    const itemHalf = centerItem ? centerItem.offsetWidth / 2 : 58;
    const spacerWidth = Math.max(16, rail.clientWidth / 2 - itemHalf);

    if (leadSpacerRef.current) {
      leadSpacerRef.current.style.width = `${spacerWidth}px`;
    }
    if (trailSpacerRef.current) {
      trailSpacerRef.current.style.width = `${spacerWidth}px`;
    }

    const scrollCenter = rail.scrollLeft + rail.clientWidth / 2;
    const halfRail = Math.max(rail.clientWidth / 2, 1);

    itemRefs.current.forEach((item) => {
      if (!item) return;

      const itemCenter = item.offsetLeft + item.offsetWidth / 2;
      const offset = (itemCenter - scrollCenter) / halfRail;
      const clamped = Math.max(-1, Math.min(1, offset));
      const distance = Math.abs(clamped);

      const rotateY = clamped * -MAX_ROTATE_Y;
      const scale = 1 - distance * (1 - MIN_SCALE);
      const translateZ = (1 - distance) * MAX_TRANSLATE_Z;
      const opacity = 1 - distance * (1 - MIN_OPACITY);

      item.style.transform = `rotateY(${rotateY}deg) scale(${scale}) translateZ(${translateZ}px)`;
      item.style.opacity = String(opacity);
      item.style.zIndex = String(Math.round((1 - distance) * 100));
    });
  }, [centerIndex]);

  useEffect(() => {
    itemRefs.current.length = childCount;
  }, [childCount]);

  useEffect(() => {
    const rail = railRef.current;
    if (!rail) return;

    let rafId: number | null = null;
    const scheduleLayout = () => {
      if (rafId !== null) return;
      rafId = requestAnimationFrame(() => {
        rafId = null;
        updateLayout();
      });
    };

    const frame = requestAnimationFrame(() => {
      updateLayout();
      requestAnimationFrame(() => scrollToCenter(centerIndex));
    });

    rail.addEventListener("scroll", scheduleLayout, { passive: true });
    window.addEventListener("resize", scheduleLayout);

    const observer = new ResizeObserver(() => {
      updateLayout();
      scrollToCenter(centerIndex);
    });
    observer.observe(rail);

    return () => {
      cancelAnimationFrame(frame);
      if (rafId !== null) cancelAnimationFrame(rafId);
      rail.removeEventListener("scroll", scheduleLayout);
      window.removeEventListener("resize", scheduleLayout);
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
