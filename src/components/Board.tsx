import { useBoard } from "@/providers/BoardProvider";
import styles from "@/styles/Board.module.css";
import ActiveCard from "./ActiveCard";
import Card from "./Card";
import Hand from "./Hand";

export const Board: React.FC = () => {
  const { G, moves, ctx } = useBoard();

  return (
    <div className={styles["board"]}>
      <div className={styles["decks"]}>
        <div className={styles["deck"]}>
          {G.deck[0] && <Card card={G.deck[0]} onClick={moves.drawFromDeck} />}
        </div>
        <div className={styles["discard"]}>
          {G.discard[0] && <Card card={G.discard[0]} faceUp />}
        </div>
      </div>

      {ctx.playOrder.map((id) => {
        const player = G.players[id]!;

        return (
          <div key={id} className={styles["hand"]}>
            <Hand key={id} player={player} />
          </div>
        );
      })}

      <ActiveCard />

      <div className={styles["players"]}>
        {/* Player hands */}
      </div>
      <div className={styles["activePlayers"]}>
        {/* Active player indicator */}
      </div>
    </div>
  );
};
