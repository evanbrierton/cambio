import { parseCoordinates } from "@/game/card";
import { useBoard } from "@/providers/BoardProvider";

import styles from "@/styles/Hands.module.css";
import { rotate } from "@/utils";
import { useState } from "react";
import Hand from "./Hand";

const Hands: React.FC = () => {
  const { G, ctx, playerID, moves, stage, events } = useBoard();
  const [selectedCards, setSelectedCards] = useState<Set<string>>(new Set());

  return (
    <div className={styles["hands-container"]}>
      <div className={styles["hands"]}>
        {rotate(ctx.playOrder, playerID).map((id) => {
          const player = G.players[id!]!;

          return (
            <Hand key={id} player={player} selectedCards={selectedCards} setSelectedCards={setSelectedCards} />
          );
        })}
      </div>
      {/* make a control bar with a swap button */}
      <div className={styles["controls"]}>
        <button
          className={styles["swap"]}
          onClick={() => {
            if (stage === "swapStage") {
              moves.swapCards(new Set(Array.from(selectedCards).map(hash => parseCoordinates(hash))));
              setSelectedCards(new Set());
            }
          }}
          disabled={selectedCards.size !== 2}
        >
          Swap
        </button>
        <button
          className={styles["swap"]}
          onClick={() => {
            if (stage === "swapStage") {
              events.endStage!();
            }
          }}
          disabled={selectedCards.size !== 2}
        >
          Skip
        </button>
        <button
          className={styles["swap"]}
          onClick={() => {
            if (stage === "drawStage") {
              moves.callCambio();
            }
          }}
          disabled={stage !== "drawStage" || ctx.currentPlayer !== playerID}
        >
          Cambio
        </button>
      </div>
    </div>
  );
};

export default Hands;
