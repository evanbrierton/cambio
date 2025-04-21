import { useBoard } from "@/providers/BoardProvider";
import styles from "@/styles/Board.module.css";
import ActiveCard from "./ActiveCard";
import Card from "./Card";
import Hands from "./Hands";

export const Board: React.FC = () => {
  const { G, moves } = useBoard();

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

      <Hands />

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
