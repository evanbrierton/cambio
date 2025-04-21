import type { CardCoordinates, CardWithPosition, Hand as HandType } from "@/game/card";
import type { PlayerState } from "@/game/state";
import { stringifyCoordinates } from "@/game/card";
import { useBoard } from "@/providers/BoardProvider";
import styles from "@/styles/Hand.module.css";
import Card from "./Card";

type Props = {
  player: PlayerState
  selectedCards: Set<string>
  setSelectedCards: React.Dispatch<React.SetStateAction<Set<string>>>
};

const Hand: React.FC<Props> = ({ player, selectedCards, setSelectedCards }) => {
  const { moves, ctx } = useBoard();

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

    if (stage === "peekOpponentStage") {
      return moves.peekOpponent(coordinates);
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
      {cards.map((card) => {
        const coordinates = { player: player.id, position: card.position };
        const selected = selectedCards.has(stringifyCoordinates(coordinates));
        return <Card key={card.id} card={card} onClick={handleClick(coordinates)} selected={selected} />;
      })}
    </div>
  );
};

export default Hand;
