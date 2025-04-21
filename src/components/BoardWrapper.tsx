import type { CambioState } from "@/game/state";
import type { BoardProps } from "boardgame.io/react";
import { BoardProvider } from "@/providers/BoardProvider";
import { Board } from "./Board";

const BoardWrapper: React.FC<BoardProps<CambioState>> = (board) => {
  return (
    <BoardProvider value={board}>
      <Board />
    </BoardProvider>
  );
};

export default BoardWrapper;
