import type { CardCoordinates, CardWithCoordinates, Hand as HandType } from "@/game/card";
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
  const { G, moves, ctx, stage, currentPlayerStage, playerID } = useBoard();

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

    if (stage === "donateStage") {
      return moves.donate(coordinates);
    }

    return moves.snap(coordinates);
  };

  const cards = Object.assign<CardWithCoordinates[], HandType>([], player.hand);

  return (
    <div className={styles["hand"]}>
      {cards.map((card) => {
        const selected = selectedCards.has(stringifyCoordinates(card.coordinates));
        const faceUp = currentPlayerStage === "drawStage" && ctx.turn === 1 && [2, 3].includes(card.coordinates.position) && player.id === playerID;

        const position = G.active?.coordinates?.position;
        const playerId = G.active?.coordinates?.player;

        const isActive = playerId === player.id && position === card.coordinates.position;

        return <Card key={card.id} card={card} onClick={handleClick(card.coordinates)} selected={selected} faceUp={faceUp} held={isActive} />;
      })}
    </div>
  );
};

export default Hand;
