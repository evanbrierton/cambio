"use client";

import { hapticClick } from "@cambio/client";
import { useRouter } from "next/navigation";
import {
  type ReactNode,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import {
  clampSwipeOffset,
  isFromLeaveEdge,
  isHorizontalLeaveLock,
  isSwipeCommit,
  isVerticalScrollLock,
  swipeVelocityPxS,
} from "@/lib/swipe-to-leave";

const DESKTOP_MQ = "(min-width: 1024px)";

type SwipeToLeaveProps = {
  enabled: boolean;
  label: string;
  children: ReactNode;
  className?: string;
  onLeave?: () => void;
};

function shouldIgnoreMouse(pointerType: string): boolean {
  return (
    pointerType === "mouse" &&
    typeof window !== "undefined" &&
    window.matchMedia(DESKTOP_MQ).matches
  );
}

function isIgnoredTarget(target: EventTarget | null): boolean {
  if (!(target instanceof Element)) return false;
  return Boolean(
    target.closest("input, textarea, select, [contenteditable='true']"),
  );
}

export function SwipeToLeave({
  enabled,
  label,
  children,
  className = "",
  onLeave,
}: SwipeToLeaveProps) {
  const router = useRouter();
  const rootRef = useRef<HTMLDivElement>(null);
  const startXRef = useRef(0);
  const startYRef = useRef(0);
  const startTRef = useRef(0);
  const pointerIdRef = useRef<number | null>(null);
  const trackingRef = useRef(false);
  const horizontalRef = useRef(false);
  const [offset, setOffset] = useState(0);
  const [dragging, setDragging] = useState(false);

  const leave = useCallback(() => {
    hapticClick("light");
    if (onLeave) {
      onLeave();
      return;
    }
    router.push("/");
  }, [onLeave, router]);
  const leaveRef = useRef(leave);
  leaveRef.current = leave;

  const reset = useCallback(() => {
    trackingRef.current = false;
    horizontalRef.current = false;
    pointerIdRef.current = null;
    setDragging(false);
    setOffset(0);
  }, []);

  useEffect(() => {
    const root = rootRef.current;
    if (!root || !enabled) {
      reset();
      return;
    }

    const onPointerDown = (event: PointerEvent) => {
      if (shouldIgnoreMouse(event.pointerType)) return;
      if (event.pointerType === "mouse" && event.button !== 0) return;
      if (isIgnoredTarget(event.target)) return;
      trackingRef.current = true;
      horizontalRef.current = false;
      pointerIdRef.current = event.pointerId;
      startXRef.current = event.clientX;
      startYRef.current = event.clientY;
      startTRef.current = event.timeStamp;
    };

    const onPointerMove = (event: PointerEvent) => {
      if (!trackingRef.current) return;
      if (
        pointerIdRef.current != null &&
        event.pointerId !== pointerIdRef.current
      ) {
        return;
      }
      const dx = event.clientX - startXRef.current;
      const dy = event.clientY - startYRef.current;
      if (!horizontalRef.current) {
        if (isVerticalScrollLock(dx, dy)) {
          trackingRef.current = false;
          return;
        }
        const fromEdge = isFromLeaveEdge(startXRef.current);
        if (
          !(fromEdge && dx >= 6 && dx > Math.abs(dy)) &&
          !isHorizontalLeaveLock(dx, dy)
        ) {
          return;
        }
        horizontalRef.current = true;
        setDragging(true);
        try {
          root.setPointerCapture(event.pointerId);
        } catch {
          // Window listeners still follow the pointer if capture is refused.
        }
      }
      if (event.cancelable) event.preventDefault();
      setOffset(clampSwipeOffset(dx));
    };

    const onPointerUp = (event: PointerEvent) => {
      if (!trackingRef.current) return;
      if (
        pointerIdRef.current != null &&
        event.pointerId !== pointerIdRef.current
      ) {
        return;
      }
      const wasHorizontal = horizontalRef.current;
      const dx = wasHorizontal
        ? clampSwipeOffset(event.clientX - startXRef.current)
        : 0;
      const velocity = swipeVelocityPxS(
        startXRef.current,
        event.clientX,
        event.timeStamp - startTRef.current,
      );
      trackingRef.current = false;
      horizontalRef.current = false;
      pointerIdRef.current = null;
      setDragging(false);
      if (root.hasPointerCapture(event.pointerId)) {
        root.releasePointerCapture(event.pointerId);
      }
      if (wasHorizontal && isSwipeCommit(dx, velocity)) {
        leaveRef.current();
      }
      setOffset(0);
    };

    const onPointerCancel = (event: PointerEvent) => {
      if (
        pointerIdRef.current != null &&
        event.pointerId !== pointerIdRef.current
      ) {
        return;
      }
      reset();
    };

    root.addEventListener("pointerdown", onPointerDown, { capture: true });
    window.addEventListener("pointermove", onPointerMove, {
      capture: true,
      passive: false,
    });
    window.addEventListener("pointerup", onPointerUp, { capture: true });
    window.addEventListener("pointercancel", onPointerCancel, {
      capture: true,
    });

    return () => {
      root.removeEventListener("pointerdown", onPointerDown, { capture: true });
      window.removeEventListener("pointermove", onPointerMove, {
        capture: true,
      });
      window.removeEventListener("pointerup", onPointerUp, { capture: true });
      window.removeEventListener("pointercancel", onPointerCancel, {
        capture: true,
      });
    };
  }, [enabled, reset]);

  return (
    <div
      ref={rootRef}
      className={`swipe-leave-root ${dragging ? "is-swiping" : ""} ${className}`.trim()}
      data-swipe-to-leave={enabled ? "on" : "off"}
    >
      {enabled ? (
        <div className="swipe-leave-underlay" aria-hidden>
          <span className="swipe-leave-label">{label}</span>
        </div>
      ) : null}
      <div
        className="swipe-leave-surface"
        style={{
          transform: offset ? `translate3d(${offset}px, 0, 0)` : undefined,
          transition: dragging ? "none" : "transform 180ms ease-out",
        }}
      >
        {children}
      </div>
    </div>
  );
}
