import type { ReactNode } from "react";

type RetroButtonProps = {
  children: ReactNode;
  onClick?: () => void;
  variant?: "primary" | "secondary" | "danger";
  disabled?: boolean;
  className?: string;
};

export function RetroButton({
  children,
  onClick,
  variant = "primary",
  disabled = false,
  className = "",
}: RetroButtonProps) {
  const variants = {
    primary: "btn-primary",
    secondary: "btn-secondary",
    danger: "btn-danger",
  };

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`btn-theme text-[10px] sm:text-xs px-4 py-3 transition-all active:translate-y-0.5 disabled:opacity-40 ${variants[variant]} ${className}`}
    >
      {children}
    </button>
  );
}
