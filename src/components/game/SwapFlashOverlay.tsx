"use client";

type SwapFlashOverlayProps = {
  small: boolean;
  slotLabel?: string;
};

export function SwapFlashOverlay({ small, slotLabel }: SwapFlashOverlayProps) {
  return (
    <div className="absolute inset-0 z-30 flex flex-col items-center justify-center rounded-card pointer-events-none overflow-hidden swap-flash-overlay">
      <div className="absolute inset-0 bg-swap-flash-base" />
      <div className="absolute inset-0 swap-flash-crossfade" />
      <div className="absolute inset-0 border-[3px] border-swap-flash-a swap-flash-ring" />
      <div className="absolute inset-1 border-2 border-dashed border-swap-flash-b/80 swap-flash-orbit" />
      <svg
        className="absolute inset-0 h-full w-full swap-flash-arc"
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        role="presentation"
        aria-hidden="true"
      >
        <path
          className="swap-flash-arc-path swap-flash-arc-path-a"
          d="M 8 72 Q 50 8 92 72"
          fill="none"
          strokeWidth="3"
          strokeLinecap="round"
        />
        <path
          className="swap-flash-arc-path swap-flash-arc-path-b"
          d="M 8 28 Q 50 92 92 28"
          fill="none"
          strokeWidth="3"
          strokeLinecap="round"
        />
      </svg>
      {slotLabel && (
        <span className="relative mb-1 font-display font-bold text-[8px] sm:text-[9px] text-white/95 tracking-wider swap-flash-slot-label">
          {slotLabel}
        </span>
      )}
      <span
        className={`relative font-display font-bold text-white drop-shadow-[0_2px_12px_rgba(0,0,0,0.75)] swap-flash-icon ${
          small ? "text-3xl lg:text-5xl" : "text-5xl"
        }`}
      >
        ⇄
      </span>
      <span className="relative mt-1 font-display font-bold text-[8px] sm:text-[9px] text-white tracking-[0.28em] swap-flash-label">
        SWAP
      </span>
    </div>
  );
}
