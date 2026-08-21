"use client";

import { hapticClick } from "@cambio/client";
import { useRouter } from "next/navigation";
import {
  type PointerEvent,
  type ReactNode,
  useCallback,
  useRef,
  useState,
} from "react";
import {
  clampSwipeOffset,
  isFromLeaveEdge,
  isSwipeCommit,
  swipeVelocityPxS,
} from "@/lib/swipe-to-leave";

type SwipeToLeaveProps = {
  enabled: boolean;
  label: string;
  children: ReactNode;
  className?: string;
  onLeave?: () => void;
};

export function SwipeToLeave({
  enabled,
  label,
  children,
  className = "",
  onLeave,
}: SwipeToLeaveProps) {
  const router = useRouter();
  const edgeRef = useRef<HTMLDivElement>(null);
  const startXRef = useRef(0);
  const startTRef = useRef(0);
  const trackingRef = useRef(false);
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

  const reset = useCallback(() => {
    trackingRef.current = false;
    setDragging(false);
    setOffset(0);
  }, []);

  const onPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (!enabled) return;
    if (event.pointerType !== "touch") return;
    const edgeWidth = edgeRef.current?.offsetWidth ?? 28;
    if (!isFromLeaveEdge(event.clientX, edgeWidth)) return;
    trackingRef.current = true;
    startXRef.current = event.clientX;
    startTRef.current = event.timeStamp;
    setDragging(true);
    setOffset(0);
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const onPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    if (!trackingRef.current) return;
    const dx = event.clientX - startXRef.current;
    setOffset(clampSwipeOffset(dx));
  };

  const onPointerUp = (event: PointerEvent<HTMLDivElement>) => {
    if (!trackingRef.current) return;
    const dx = clampSwipeOffset(event.clientX - startXRef.current);
    const velocity = swipeVelocityPxS(
      startXRef.current,
      event.clientX,
      event.timeStamp - startTRef.current,
    );
    trackingRef.current = false;
    setDragging(false);
    if (isSwipeCommit(dx, velocity)) {
      leave();
    }
    setOffset(0);
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  };

  return (
    <div className={`swipe-leave-root ${className}`.trim()}>
      {enabled ? (
        <>
          <div className="swipe-leave-underlay" aria-hidden>
            <span className="swipe-leave-label">{label}</span>
          </div>
          <div
            ref={edgeRef}
            className="swipe-leave-edge"
            data-swipe-leave-edge
            aria-hidden
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={reset}
          />
        </>
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
