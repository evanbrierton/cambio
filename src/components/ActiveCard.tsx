import { useBoard } from "@/providers/BoardProvider";
import styles from "@/styles/ActiveCard.module.css";
import Card from "./Card";

const ActiveCard: React.FC = () => {
  const { G, moves, stage } = useBoard();

  const handleClick: React.MouseEventHandler<HTMLDivElement> = () => {
    if (stage === "playStage") {
      return moves.playCard();
    }

    if (stage === "dismissStage") {
      return moves.dismiss();
    }
  };

  return (
    <div className={styles["activeCard"]}>
      {G.active && <Card card={G.active} faceUp onClick={handleClick} />}
    </div>
  );
};

export default ActiveCard;
