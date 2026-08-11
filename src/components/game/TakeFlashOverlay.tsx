"use client";

type TakeFlashOverlayProps = {
  small: boolean;
  slotLabel?: string;
};

/** Mild cyan take feedback for drawn-card hand placement — not the ability swap spectacle. */
export function TakeFlashOverlay({ small, slotLabel }: TakeFlashOverlayProps) {
  return (
    <div className="absolute inset-0 z-30 flex flex-col items-center justify-center rounded-card pointer-events-none overflow-hidden take-flash-overlay">
      <div className="absolute inset-0 bg-accent-alt/55" />
      <div className="absolute inset-0 bg-linear-to-br from-accent-alt/60 via-white/20 to-accent-alt/40 take-flash-shimmer" />
      <div className="absolute inset-0 border-4 border-accent-alt take-flash-ring" />
      {slotLabel && (
        <span className="relative mb-1 font-display font-bold text-[8px] sm:text-[9px] text-white/90 tracking-wider">
          {slotLabel}
        </span>
      )}
      <span
        className={`relative font-display font-bold text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.65)] take-flash-icon ${
          small ? "text-2xl lg:text-4xl" : "text-4xl"
        }`}
      >
        ↓
      </span>
      <span className="relative mt-1 font-display font-bold text-[8px] sm:text-[9px] text-white tracking-widest take-flash-label">
        TAKE
      </span>
    </div>
  );
}
