import { parseCoordinates } from "@/game/card";
import { useBoard } from "@/providers/BoardProvider";
import styles from "@/styles/Board.module.css";
import { useState } from "react";
import ActiveCard from "./ActiveCard";
import Card from "./Card";
import Hands from "./Hands";

export const Board: React.FC = () => {
  const { G, ctx, events, moves, stage, playerID } = useBoard();
  const [selectedCards, setSelectedCards] = useState<Set<string>>(new Set());

  return (
    <div className={styles["board"]}>
      <div className={styles["decks"]}>
        <div className={styles["deck"]}>
          {G.deck[0] && <Card card={G.deck[0]} onClick={moves.drawFromDeck} />}
        </div>
        <div className={styles["discard"]}>
          {G.discard[0] && <Card card={G.discard[0]} faceUp onClick={moves.drawFromDiscard} />}
        </div>
      </div>

      <Hands />

      <div className={styles["controls"]}>
        <button
          className={styles["swap"]}
          onClick={() => {
            if (stage === "swapStage") {
              moves.swapCards(new Set(Array.from(selectedCards).map(hash => parseCoordinates(hash))));
              setSelectedCards(new Set());
            }
          }}
          disabled={stage !== "swapStage" || ctx.currentPlayer !== playerID || selectedCards.size !== 2}
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
          disabled={stage !== "swapStage" || ctx.currentPlayer !== playerID}
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

      <ActiveCard />
    </div>
  );
};
