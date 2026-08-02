"use client";

import { Children, isValidElement, type ReactNode } from "react";

type PlayerGridStageProps = {
  children: ReactNode;
};

export function PlayerGridStage({ children }: PlayerGridStageProps) {
  return (
    <div className="players-grid-stage">
      <div className="players-grid scroll-stable">
        {Children.map(children, (child, index) => (
          <div
            key={
              isValidElement(child) && child.key != null
                ? `grid-${String(child.key)}`
                : `grid-${index}`
            }
            className="players-grid-item"
          >
            {child}
          </div>
        ))}
      </div>
    </div>
  );
}
