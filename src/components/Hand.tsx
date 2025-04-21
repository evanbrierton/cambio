import type { PlayerState } from "@/game/state";

import { parseCoordinates, stringifyCoordinates, type CardCoordinates, type CardWithPosition, type Hand as HandType } from "@/types";
import { useBoard } from "@/providers/BoardProvider";
import styles from "@/styles/Hand.module.css";
import { useState } from "react";
import Card from "./Card";

type Props = {
  player: PlayerState
};

const Hand: React.FC<Props> = ({ player }) => {
  const { moves, ctx } = useBoard();
  const [selectedCards, setSelectedCards] = useState<Set<string>>(new Set());

  const stage = ctx.activePlayers?.[ctx.currentPlayer];

  const toggleSelectedCard = (coordinates: CardCoordinates): void => {
    const newSelectedCards = new Set(selectedCards);
    const hash = stringifyCoordinates(coordinates);

    if (newSelectedCards.has(hash)) {
      newSelectedCards.delete(hash);
    }
    else {
      newSelectedCards.add(hash);
    }

    setSelectedCards(newSelectedCards);
  };

  const handleClick = (coordinates: CardCoordinates): React.MouseEventHandler<HTMLDivElement> => () => {
    if (stage === "playStage") {
      return moves.takeCard(coordinates);
    }

    if (stage === "peekSelfStage") {
      return moves.peekSelf(coordinates);
    }

    if (stage === "peekAnyStage") {
      return moves.peekAny(coordinates);
    }

    if (stage === "swapStage") {
      return toggleSelectedCard(coordinates);
    }
  };

  const cards = Object.assign<CardWithPosition[], HandType>([], player.hand);

  return (
    <div className={styles["hand"]}>
      {cards.map(card => {
        const coordinates = { player: player.id, position: card.position };
        const selected = selectedCards.has(stringifyCoordinates(coordinates));
        return <Card key={card.id} card={card} onClick={handleClick(coordinates)} selected={selected} />
      })}
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
    </div>
  );
};

export default Hand;
