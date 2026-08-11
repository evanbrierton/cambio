"use client";

type SnapFlashOverlayProps = {
  small: boolean;
  slotLabel?: string;
};

/** Danger-red snap hit feedback — distinct from take (cyan) and ability swap (gold/violet). */
export function SnapFlashOverlay({ small, slotLabel }: SnapFlashOverlayProps) {
  return (
    <div className="absolute inset-0 z-30 flex flex-col items-center justify-center rounded-card pointer-events-none overflow-hidden snap-flash-overlay">
      <div className="absolute inset-0 bg-danger-surface/80" />
      <div className="absolute inset-0 bg-linear-to-br from-danger/70 via-accent/35 to-danger-surface/80 snap-flash-shimmer" />
      <div className="absolute inset-0 border-4 border-danger snap-flash-ring" />
      {slotLabel && (
        <span className="relative mb-1 font-display font-bold text-[8px] sm:text-[9px] text-danger-text tracking-wider">
          {slotLabel}
        </span>
      )}
      <span
        className={`relative font-display font-bold text-danger-text drop-shadow-[0_2px_10px_rgba(0,0,0,0.75)] snap-flash-icon ${
          small ? "text-3xl lg:text-5xl" : "text-5xl"
        }`}
      >
        ✦
      </span>
      <span className="relative mt-1 font-display font-bold text-[8px] sm:text-[9px] text-danger-text tracking-[0.28em] snap-flash-label">
        SNAP
      </span>
    </div>
  );
}
