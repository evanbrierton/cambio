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

const SEAT_CARD_RATIO = 5 / 7;

function applySeatCardScale(stage: HTMLElement, rail: HTMLElement) {
  const styles = getComputedStyle(rail);
  const padY =
    (Number.parseFloat(styles.paddingTop) || 0) +
    (Number.parseFloat(styles.paddingBottom) || 0);
  const availH = Math.max(80, rail.clientHeight - padY);
  const reserved = 56;
  const rowGap = 6;
  let cardH = (availH - reserved - rowGap) / 2;
  cardH = Math.min(124, Math.max(72, cardH));
  const cardW = cardH * SEAT_CARD_RATIO;
  const gap = 6;
  const handW = cardW * 2 + gap;
  const fontSize = Math.max(10, cardH * 0.14);

  stage.style.setProperty("--seat-card-w", `${cardW}px`);
  stage.style.setProperty("--seat-card-h", `${cardH}px`);
  stage.style.setProperty("--seat-hand-w", `${handW}px`);
  stage.style.setProperty("--seat-card-fs", `${fontSize}px`);
}

export function PlayerScrollStage({
  children,
  centerIndex = 0,
}: PlayerScrollStageProps) {
  const stageRef = useRef<HTMLDivElement>(null);
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
      if (rail.classList.contains("is-static")) return;

      const target =
        item.offsetLeft + item.offsetWidth / 2 - rail.clientWidth / 2;
      rail.scrollTo({ left: target, behavior });
    },
    [],
  );

  const updateLayout = useCallback(() => {
    const stage = stageRef.current;
    const rail = railRef.current;
    if (!rail) return;

    if (stage) {
      applySeatCardScale(stage, rail);
      // Force layout so pack-when-fits measures scaled seat widths.
      void stage.offsetWidth;
    }

    const reducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    const items = itemRefs.current
      .slice(0, childCount)
      .filter((item): item is HTMLDivElement => item != null);
    const styles = getComputedStyle(rail);
    const gap = Number.parseFloat(styles.columnGap || styles.gap || "0") || 0;
    const contentWidth = items.reduce(
      (sum, item, index) => sum + item.offsetWidth + (index > 0 ? gap : 0),
      0,
    );
    const paddingX =
      (Number.parseFloat(styles.paddingLeft) || 0) +
      (Number.parseFloat(styles.paddingRight) || 0);
    const availableWidth = Math.max(0, rail.clientWidth - paddingX);
    const fits = contentWidth <= availableWidth + 0.5;

    rail.classList.toggle("players-3d-rail-packed", fits);
    rail.classList.toggle("is-static", fits);
    stage?.classList.toggle("is-static", fits);

    const centerItem = itemRefs.current[centerIndex];
    const itemHalf = centerItem ? centerItem.offsetWidth / 2 : 58;
    const spacerWidth = fits
      ? 0
      : Math.max(16, rail.clientWidth / 2 - itemHalf);

    if (leadSpacerRef.current) {
      leadSpacerRef.current.style.width = `${spacerWidth}px`;
    }
    if (trailSpacerRef.current) {
      trailSpacerRef.current.style.width = `${spacerWidth}px`;
    }

    if (fits) {
      rail.scrollTo({ left: 0 });
    }

    const railRect = rail.getBoundingClientRect();
    const center = railRect.left + railRect.width / 2;

    itemRefs.current.forEach((item) => {
      if (!item) return;

      if (reducedMotion || fits) {
        item.style.transform = "";
        item.style.opacity = "";
        return;
      }

      const rect = item.getBoundingClientRect();
      const itemCenter = rect.left + rect.width / 2;
      const offset = (itemCenter - center) / Math.max(railRect.width, 1);
      const clamped = Math.max(-1, Math.min(1, offset));
      const rotateY = clamped * -12;
      const scale = 1 - Math.abs(clamped) * 0.06;
      const translateZ = (1 - Math.abs(clamped)) * 14;

      item.style.transform = `rotateY(${rotateY}deg) scale(${scale}) translateZ(${translateZ}px)`;
      item.style.opacity = String(1 - Math.abs(clamped) * 0.15);
    });
  }, [centerIndex, childCount]);

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
    <div ref={stageRef} className="players-3d-stage">
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
