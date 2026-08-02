"use client";

import { Children, isValidElement, type ReactNode } from "react";

type PlayerGridStageProps = {
  children: ReactNode;
};

export function PlayerGridStage({ children }: PlayerGridStageProps) {
  return (
    <div className="flex flex-1 flex-col min-h-0 min-w-0 overflow-hidden">
      <div className="flex-1 basis-0 min-h-0 overflow-y-auto overflow-x-auto overscroll-contain [-webkit-overflow-scrolling:touch]">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-2 xl:grid-cols-3 gap-3 p-2 justify-items-center">
          {Children.map(children, (child, index) => (
            <div
              key={
                isValidElement(child) && child.key != null
                  ? `grid-${String(child.key)}`
                  : `grid-${index}`
              }
              className="min-w-0 w-full flex justify-center"
            >
              {child}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
