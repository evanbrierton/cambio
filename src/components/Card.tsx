import type { Card as CardType } from "@/game/card";
import styles from "@/styles/Card.module.css";

import Image from "next/image";

type Props = {
  card: CardType
  selected?: boolean
  faceUp?: boolean
  onClick?: React.MouseEventHandler<HTMLDivElement>
};

const getCardSrc = (card: CardType, faceUp: boolean): string => {
  const getSlug = (): string => {
    if (card.rank === "empty") {
      return "blank.png";
    }

    if (!faceUp) {
      return "back.png";
    }

    if (card.rank === "joker") {
      return `jokers/${card.color}.png`;
    }

    return `${card.suit}/${card.rank}.png`;
  };

  return `/assets/cards/${getSlug()}`;
};

const getCardAltText = (card: CardType, faceUp: boolean): string => {
  if (card.rank === "empty") {
    return "Empty placeholder";
  }

  if (!faceUp) {
    return "Card back";
  }

  if (card.rank === "joker") {
    return `${card.color} joker`;
  }

  return `${card.value} of ${card.suit}`;
};

const Card: React.FC<Props> = ({ card, selected = false, faceUp = false, onClick }) => {
  return (
    <div className={`${styles["card"]} ${selected ? styles["selected"] : ""}`} onClick={onClick}>
      <Image
        priority
        src={getCardSrc(card, faceUp)}
        alt={getCardAltText(card, faceUp)}
        width={142}
        height={190}
      />
    </div>
  );
};

export default Card;
