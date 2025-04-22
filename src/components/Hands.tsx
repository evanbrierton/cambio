import { useBoard } from "@/providers/BoardProvider";

import styles from "@/styles/Hands.module.css";
import { rotate } from "@/utils";
import { useState } from "react";
import Hand from "./Hand";

const Hands: React.FC = () => {
  const { G, ctx, playerID } = useBoard();
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
    </div>
  );
};

export default Hands;
