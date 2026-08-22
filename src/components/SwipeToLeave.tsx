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
  isInsideHorizontalScrollTarget,
  isSwipeCommit,
  isVerticalScrollLock,
  swipeVelocityPxS,
} from "@/lib/swipe-to-leave";

type SwipeToLeaveProps = {
  enabled: boolean;
  label: string;
  children: ReactNode;
  className?: string;
  onLeave?: () => void;
};

type GesturePoint = {
  x: number;
  y: number;
  timeStamp: number;
};

function isDesktopWidth(): boolean {
  return typeof window !== "undefined" && window.innerWidth >= 1024;
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
  const startRef = useRef<GesturePoint>({ x: 0, y: 0, timeStamp: 0 });
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

    const startGesture = (
      point: GesturePoint,
      pointerId: number | null,
      target: EventTarget | null,
    ) => {
      // Horizontal rails own pan-x; do not arm leave over them.
      if (isInsideHorizontalScrollTarget(target)) return;
      trackingRef.current = true;
      horizontalRef.current = false;
      pointerIdRef.current = pointerId;
      startRef.current = point;
    };

    const moveGesture = (point: GesturePoint) => {
      if (!trackingRef.current) return;
      const dx = point.x - startRef.current.x;
      const dy = point.y - startRef.current.y;
      if (!horizontalRef.current) {
        if (isVerticalScrollLock(dx, dy)) {
          // Abandon leave tracking so vertical momentum stays with the OS scroller.
          trackingRef.current = false;
          return;
        }
        const fromEdge = isFromLeaveEdge(startRef.current.x);
        if (
          !(fromEdge && dx >= 6 && dx > Math.abs(dy)) &&
          !isHorizontalLeaveLock(dx, dy)
        ) {
          return;
        }
        horizontalRef.current = true;
        setDragging(true);
      }
      setOffset(clampSwipeOffset(dx));
    };

    const endGesture = (point: GesturePoint) => {
      if (!trackingRef.current) return;
      const wasHorizontal = horizontalRef.current;
      const dx = wasHorizontal
        ? clampSwipeOffset(point.x - startRef.current.x)
        : 0;
      const velocity = swipeVelocityPxS(
        startRef.current.x,
        point.x,
        point.timeStamp - startRef.current.timeStamp,
      );
      trackingRef.current = false;
      horizontalRef.current = false;
      pointerIdRef.current = null;
      setDragging(false);
      if (wasHorizontal && isSwipeCommit(dx, velocity)) {
        leaveRef.current();
      }
      setOffset(0);
    };

    const onPointerDown = (event: PointerEvent) => {
      if (trackingRef.current) return;
      if (event.pointerType === "mouse" && isDesktopWidth()) return;
      if (event.pointerType === "mouse" && event.button !== 0) return;
      if (isIgnoredTarget(event.target)) return;
      startGesture(
        { x: event.clientX, y: event.clientY, timeStamp: event.timeStamp },
        event.pointerId,
        event.target,
      );
    };

    const onPointerMove = (event: PointerEvent) => {
      if (!trackingRef.current) return;
      if (
        pointerIdRef.current != null &&
        event.pointerId !== pointerIdRef.current
      ) {
        return;
      }
      // Only preventDefault after horizontal leave lock — never on vertical paths.
      if (horizontalRef.current && event.cancelable) event.preventDefault();
      moveGesture({
        x: event.clientX,
        y: event.clientY,
        timeStamp: event.timeStamp,
      });
    };

    const onPointerUp = (event: PointerEvent) => {
      if (
        pointerIdRef.current != null &&
        event.pointerId !== pointerIdRef.current
      ) {
        return;
      }
      if (root.hasPointerCapture(event.pointerId)) {
        root.releasePointerCapture(event.pointerId);
      }
      endGesture({
        x: event.clientX,
        y: event.clientY,
        timeStamp: event.timeStamp,
      });
    };

    const onTouchStart = (event: TouchEvent) => {
      if (trackingRef.current) return;
      if (event.touches.length !== 1) return;
      if (isIgnoredTarget(event.target)) return;
      const touch = event.touches[0];
      startGesture(
        { x: touch.clientX, y: touch.clientY, timeStamp: event.timeStamp },
        null,
        event.target,
      );
    };

    const onTouchMove = (event: TouchEvent) => {
      if (!trackingRef.current) return;
      const touch = event.touches[0];
      if (!touch) return;
      // Only preventDefault after horizontal leave lock — never on vertical paths.
      if (horizontalRef.current && event.cancelable) event.preventDefault();
      moveGesture({
        x: touch.clientX,
        y: touch.clientY,
        timeStamp: event.timeStamp,
      });
    };

    const onTouchEnd = (event: TouchEvent) => {
      const touch = event.changedTouches[0];
      if (!touch) {
        reset();
        return;
      }
      endGesture({
        x: touch.clientX,
        y: touch.clientY,
        timeStamp: event.timeStamp,
      });
    };

    const onMouseDown = (event: MouseEvent) => {
      if (event.button !== 0) return;
      if (isDesktopWidth()) return;
      if (isIgnoredTarget(event.target)) return;
      if (trackingRef.current) return;
      startGesture(
        { x: event.clientX, y: event.clientY, timeStamp: event.timeStamp },
        null,
        event.target,
      );
    };

    const onMouseMove = (event: MouseEvent) => {
      if (!trackingRef.current) return;
      if (pointerIdRef.current != null) return;
      moveGesture({
        x: event.clientX,
        y: event.clientY,
        timeStamp: event.timeStamp,
      });
    };

    const onMouseUp = (event: MouseEvent) => {
      if (pointerIdRef.current != null) return;
      endGesture({
        x: event.clientX,
        y: event.clientY,
        timeStamp: event.timeStamp,
      });
    };

    root.addEventListener("pointerdown", onPointerDown, { capture: true });
    window.addEventListener("pointermove", onPointerMove, {
      capture: true,
      passive: false,
    });
    window.addEventListener("pointerup", onPointerUp, { capture: true });
    window.addEventListener("pointercancel", reset, { capture: true });
    root.addEventListener("touchstart", onTouchStart, {
      capture: true,
      passive: true,
    });
    window.addEventListener("touchmove", onTouchMove, {
      capture: true,
      passive: false,
    });
    window.addEventListener("touchend", onTouchEnd, { capture: true });
    window.addEventListener("touchcancel", reset, { capture: true });
    root.addEventListener("mousedown", onMouseDown, { capture: true });
    window.addEventListener("mousemove", onMouseMove, { capture: true });
    window.addEventListener("mouseup", onMouseUp, { capture: true });

    return () => {
      root.removeEventListener("pointerdown", onPointerDown, { capture: true });
      window.removeEventListener("pointermove", onPointerMove, {
        capture: true,
      });
      window.removeEventListener("pointerup", onPointerUp, { capture: true });
      window.removeEventListener("pointercancel", reset, { capture: true });
      root.removeEventListener("touchstart", onTouchStart, { capture: true });
      window.removeEventListener("touchmove", onTouchMove, { capture: true });
      window.removeEventListener("touchend", onTouchEnd, { capture: true });
      window.removeEventListener("touchcancel", reset, { capture: true });
      root.removeEventListener("mousedown", onMouseDown, { capture: true });
      window.removeEventListener("mousemove", onMouseMove, { capture: true });
      window.removeEventListener("mouseup", onMouseUp, { capture: true });
    };
  }, [enabled, reset]);

  return (
    <div
      ref={rootRef}
      className={`swipe-leave-root ${dragging ? "is-swiping" : ""} ${className}`.trim()}
      data-swipe-to-leave={enabled ? "on" : "off"}
      data-swipe-offset={offset}
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
