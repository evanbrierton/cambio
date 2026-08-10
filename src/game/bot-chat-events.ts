import { cardLabel, cardPoints, suitGlyph } from "./cards";
import type {
  BotDifficulty,
  Card,
  ClientMessage,
  GameState,
  PlayerState,
} from "./types";

export type GameMoveKind =
  | "tossed_valuable_card"
  | "smart_discard"
  | "bad_swap"
  | "wrong_snap"
  | "nice_snap"
  | "opponent_snap"
  | "snap_streak"
  | "called_cambio";

export type GameMoveReaction = {
  kind: GameMoveKind;
  playerName: string;
  detail: string;
};

export type PreMoveSnapshot = {
  drawnCard: Card | null;
  swappedOutCard: Card | null;
  /** True when the draw came from the discard pile (public). */
  drawnFromDiscard: boolean;
};

type MessageResult = {
  error?: string;
  penaltyFlash?: { playerId: string; slot: number };
  cambioFlash?: { playerId: string };
};

function formatCard(card: Card): string {
  if (card.rank === "JOKER") return "Joker";
  return `${cardLabel(card)}${suitGlyph(card.suit)}`;
}

export function capturePreMoveSnapshot(
  state: GameState,
  playerId: string,
  message: ClientMessage,
): PreMoveSnapshot | null {
  if (message.type !== "discard_drawn" && message.type !== "swap") return null;

  const player = state.players.find((entry) => entry.id === playerId);
  if (!player) return null;

  let swappedOutCard: Card | null = null;
  if (message.type === "swap") {
    swappedOutCard = player.hand[message.slot]?.card ?? null;
  }

  return {
    drawnCard: state.drawnCard,
    swappedOutCard,
    drawnFromDiscard: state.drawnFromDiscard,
  };
}

/**
 * Build a move reaction that only names publicly visible cards.
 *
 * Public: discard pile (including a just-discarded / swapped-out card),
 * and a card taken from the discard pile (everyone already saw it).
 * Private: a card drawn from the deck and kept/swapped into a face-down hand.
 */
export function detectMoveReaction(
  state: GameState,
  player: PlayerState,
  message: ClientMessage,
  result: MessageResult,
  snapshot: PreMoveSnapshot | null,
  snapStreak: number,
): GameMoveReaction | null {
  const playerName = player.name;

  if (result.cambioFlash?.playerId === player.id) {
    return {
      kind: "called_cambio",
      playerName,
      detail: `${playerName} called Cambio!`,
    };
  }

  if (message.type === "snap") {
    if (result.penaltyFlash) {
      return {
        kind: "wrong_snap",
        playerName,
        detail: `${playerName} snapped wrong and took a penalty.`,
      };
    }
    if (!result.error) {
      if (snapStreak >= 2) {
        return {
          kind: "snap_streak",
          playerName,
          detail: `${playerName} is on a ${snapStreak}-snap streak!`,
        };
      }
      if (message.targetPlayerId !== player.id) {
        return {
          kind: "opponent_snap",
          playerName,
          detail: `${playerName} snapped another player's card.`,
        };
      }
      return {
        kind: "nice_snap",
        playerName,
        detail: `${playerName} landed a correct snap.`,
      };
    }
  }

  if (
    message.type === "discard_drawn" &&
    snapshot?.drawnCard &&
    !result.error
  ) {
    // Discarded draw is now on the discard pile — public.
    const card = snapshot.drawnCard;
    const points = cardPoints(card, state.cardPoints);
    const label = formatCard(card);
    if (points <= 1) {
      return {
        kind: "tossed_valuable_card",
        playerName,
        detail: `${playerName} discarded a ${label} (${points} pts) — a great card to keep!`,
      };
    }
    if (points >= 20) {
      return {
        kind: "smart_discard",
        playerName,
        detail: `${playerName} dumped a ${label} (${points} pts). Smart dump.`,
      };
    }
    if (points >= 10) {
      return {
        kind: "smart_discard",
        playerName,
        detail: `${playerName} discarded a ${label} (${points} pts).`,
      };
    }
  }

  if (
    message.type === "swap" &&
    snapshot?.drawnCard &&
    snapshot.swappedOutCard &&
    !result.error
  ) {
    const incoming = snapshot.drawnCard;
    const outgoing = snapshot.swappedOutCard;
    const inPoints = cardPoints(incoming, state.cardPoints);
    const outPoints = cardPoints(outgoing, state.cardPoints);
    const inLabel = formatCard(incoming);
    const outLabel = formatCard(outgoing);

    // Discard-pile draws are public; both sides of the swap can be named.
    if (snapshot.drawnFromDiscard) {
      if (outPoints <= 1 && inPoints >= outPoints + 4) {
        return {
          kind: "bad_swap",
          playerName,
          detail: `${playerName} swapped away a ${outLabel} (${outPoints} pts) for a ${inLabel} (${inPoints} pts).`,
        };
      }
      if (outPoints >= 10 && inPoints <= 3) {
        return {
          kind: "smart_discard",
          playerName,
          detail: `${playerName} swapped out a ${outLabel} for a ${inLabel}. Nice upgrade.`,
        };
      }
      return null;
    }

    // Deck draws kept into the hand stay private. Only name the card that
    // went face-up onto the discard pile.
    if (outPoints <= 1) {
      return {
        kind: "bad_swap",
        playerName,
        detail: `${playerName} swapped away a ${outLabel} (${outPoints} pts) from their hand.`,
      };
    }
    if (outPoints >= 20) {
      return {
        kind: "smart_discard",
        playerName,
        detail: `${playerName} swapped out a ${outLabel} (${outPoints} pts) onto the discard pile.`,
      };
    }
    if (outPoints >= 10) {
      return {
        kind: "smart_discard",
        playerName,
        detail: `${playerName} swapped out a ${outLabel} (${outPoints} pts).`,
      };
    }
  }

  return null;
}

/** Skip some minor reactions so chat does not flood. */
export function shouldReactToMove(reaction: GameMoveReaction): boolean {
  if (
    reaction.kind === "wrong_snap" ||
    reaction.kind === "called_cambio" ||
    reaction.kind === "snap_streak"
  ) {
    return true;
  }
  if (
    reaction.kind === "tossed_valuable_card" ||
    reaction.kind === "bad_swap"
  ) {
    return true;
  }
  return Math.random() < 0.45;
}

const MOVE_REACTION_MESSAGES: Record<
  GameMoveKind,
  Record<BotDifficulty, string[]>
> = {
  tossed_valuable_card: {
    easy: [
      "Oh no — that was a keeper!",
      "Are you sure about that discard? 😅",
      "That card was worth holding!",
    ],
    medium: [
      "Ouch. That discard hurt to watch.",
      "Throwing away points like that?",
      "Bold choice discarding that one.",
    ],
    hard: [
      "You just gift-wrapped points to everyone.",
      "That discard was embarrassing.",
      "Even a tarper wouldn't throw that away.",
    ],
  },
  smart_discard: {
    easy: [
      "Nice dump — smart move!",
      "Great discard, that helps a lot!",
      "Love seeing that card leave your hand!",
    ],
    medium: [
      "Clean discard.",
      "That was the right card to lose.",
      "Efficient. I'll give you that.",
    ],
    hard: [
      "Fine. One decent discard won't save you.",
      "Even you get one right sometimes.",
      "Okay, that discard wasn't terrible.",
    ],
  },
  bad_swap: {
    easy: [
      "Hmm, are you sure that swap helped?",
      "That swap looked a little rough!",
      "Maybe peek next time before swapping?",
    ],
    medium: [
      "Questionable swap right there.",
      "Swapping out the good stuff?",
      "That exchange didn't look great.",
    ],
    hard: [
      "You just swapped away your best card. Incredible.",
      "That swap was tragic.",
      "Pole-dodger-level decision making.",
    ],
  },
  wrong_snap: {
    easy: [
      "Wrong snap — ouch!",
      "Penalty card! It happens!",
      "Maybe double-check next time?",
    ],
    medium: [
      "Penalty snap. Costly.",
      "That snap didn't land.",
      "The pile says no.",
    ],
    hard: [
      "Wrong snap. Predictable.",
      "Penalty card — as expected from you.",
      "Snapped like you tarp — flat wrong.",
    ],
  },
  nice_snap: {
    easy: ["Great snap!", "Nice one — clean snap!", "Wow, quick snap!"],
    medium: ["Clean snap.", "Sharp eyes on that one.", "Good snap."],
    hard: [
      "Lucky snap.",
      "Fine. You can snap once.",
      "Don't get cocky — one snap means nothing.",
    ],
  },
  opponent_snap: {
    easy: [
      "Bold snap on their card!",
      "Wow, stealing a snap — brave!",
      "That was a gutsy snap!",
    ],
    medium: [
      "Sniping their card. Risky.",
      "Aggressive snap.",
      "Going after their hand — bold.",
    ],
    hard: [
      "Snapping their card won't save your hand.",
      "Cute aggression. Still losing.",
      "Take their card. You'll still lose.",
    ],
  },
  snap_streak: {
    easy: [
      "Snap snap snap — you're on fire!",
      "Multiple snaps! Amazing!",
      "You're snapping everything!",
    ],
    medium: [
      "Snap streak. Respect.",
      "On a roll with those snaps.",
      "Another snap? Okay, I see you.",
    ],
    hard: [
      "Snap streak? Still won't beat me.",
      "Keep snapping. I'll still win.",
      "Multiple snaps and still behind. Sad.",
    ],
  },
  called_cambio: {
    easy: [
      "Cambio! Good luck everyone!",
      "They called it — here we go!",
      "Cambio time!",
    ],
    medium: [
      "Cambio called. Final turns.",
      "They think they're ready.",
      "Cambio — let's see those hands.",
    ],
    hard: [
      "Cambio? You're bluffing.",
      "Called Cambio too early. Watch.",
      "Cambio won't save that hand.",
    ],
  },
};

export function pickMoveReactionMessage(
  difficulty: BotDifficulty,
  reaction: GameMoveReaction,
): string {
  const pool = MOVE_REACTION_MESSAGES[reaction.kind][difficulty];
  return pool[Math.floor(Math.random() * pool.length)] ?? pool[0];
}
