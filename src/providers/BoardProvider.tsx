"use client";

import type { Moves } from "@/game/moves";
import type { CambioState } from "@/game/state";
import type { BoardProps } from "boardgame.io/react";
import type { ReactNode } from "react";
import { MOVES } from "@/game/moves";
import { createContext, useContext } from "react";

type BoardCustomState = {
  stage: string | undefined
  moves: Moves
};

type BoardState = Omit<BoardProps<CambioState>, "moves"> & BoardCustomState;

export const BoardContext = createContext<BoardProps<CambioState> | undefined>(
  undefined,
);

export type BoardProviderProps = {
  children: ReactNode
  value: BoardProps<CambioState>
};

export const BoardProvider: React.FC<BoardProviderProps> = ({
  children,
  value,
}: BoardProviderProps) => {
  return (
    <BoardContext.Provider value={value}>
      {children}
    </BoardContext.Provider>
  );
};

const BoardProviderError = new Error(
  "useBoard must be used within BoardProvider",
);

const InvalidMovesError = new Error(
  "useBoard must be used within BoardProvider with valid moves",
);

const isValidMoves = (moves: Record<string, (...args: any[]) => void>): moves is Moves => {
  return Object.keys(MOVES).reduce((acc, key) => acc && !!moves[key], true);
};

export const useBoard = (): BoardState => {
  const board = useContext(BoardContext);

  if (!board) {
    throw BoardProviderError;
  }

  const { moves } = board;

  if (!isValidMoves(moves)) {
    throw InvalidMovesError;
  }

  const stage = board.ctx.activePlayers?.[board.ctx.currentPlayer];

  return { ...board, moves, stage };
};
