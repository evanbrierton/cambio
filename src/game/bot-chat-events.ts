import { fillPlayerName } from "./bot-chat";
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
 * Build a move reaction that only uses publicly visible information.
 *
 * Public: discard pile (including a just-discarded draw), and cards taken
 * from the discard pile (everyone already saw them).
 * Private: face-down hand cards, deck draws kept/swapped into a hand.
 *
 * Deck-draw swaps are skipped entirely — commenting on the card that left a
 * face-down hand (identity + points / “bad swap”) leaks hidden-hand knowledge,
 * and the replacement card is still private.
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

  if (result.cambioFlash && result.cambioFlash.playerId === player.id) {
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
    // Deck-draw swaps: the kept card stays private, and scoring the card that
    // just left a face-down hand (points / "bad swap") is still too much
    // hidden-hand knowledge. Skip commentary.
    if (!snapshot.drawnFromDiscard) {
      return null;
    }

    // Discard-pile draws are fully public (everyone already saw the take).
    // Name both cards, but do not attach point totals — those were just
    // revealed from a face-down hand on one side of the swap.
    const incoming = snapshot.drawnCard;
    const outgoing = snapshot.swappedOutCard;
    const inPoints = cardPoints(incoming, state.cardPoints);
    const outPoints = cardPoints(outgoing, state.cardPoints);
    const inLabel = formatCard(incoming);
    const outLabel = formatCard(outgoing);

    if (outPoints <= 1 && inPoints >= outPoints + 4) {
      return {
        kind: "bad_swap",
        playerName,
        detail: `${playerName} swapped away a ${outLabel} for a ${inLabel}.`,
      };
    }
    if (outPoints >= 10 && inPoints <= 3) {
      return {
        kind: "smart_discard",
        playerName,
        detail: `${playerName} swapped out a ${outLabel} for a ${inLabel}. Nice upgrade.`,
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
      "Oh no, {name} — that was a keeper!",
      "Are you sure about that discard, {name}? 😅",
      "That card was worth holding, {name}!",
    ],
    medium: [
      "Ouch. That discard hurt to watch, {name}.",
      "Throwing away points like that, {name}?",
      "Bold choice discarding that one, {name}.",
    ],
    hard: [
      "{name}, you just gift-wrapped points to everyone.",
      "That discard was embarrassing, {name}.",
      "Even a tarper wouldn't throw that away, {name}.",
    ],
  },
  smart_discard: {
    easy: [
      "Nice dump, {name} — smart move!",
      "Great discard, {name}, that helps a lot!",
      "Love seeing that card leave your hand, {name}!",
    ],
    medium: [
      "Clean discard, {name}.",
      "That was the right card to lose, {name}.",
      "Efficient, {name}. I'll give you that.",
    ],
    hard: [
      "Fine, {name}. One decent discard won't save you.",
      "Even you get one right sometimes, {name}.",
      "Okay, {name}, that discard wasn't terrible.",
    ],
  },
  bad_swap: {
    easy: [
      "Hmm, are you sure that swap helped, {name}?",
      "That swap looked a little rough, {name}!",
      "Maybe peek next time before swapping, {name}?",
    ],
    medium: [
      "Questionable swap right there, {name}.",
      "Swapping out the good stuff, {name}?",
      "That exchange didn't look great, {name}.",
    ],
    hard: [
      "{name}, you just swapped away your best card. Incredible.",
      "That swap was tragic, {name}.",
      "Pole-dodger-level decision making, {name}.",
    ],
  },
  wrong_snap: {
    easy: [
      "Wrong snap, {name} — ouch!",
      "Penalty card, {name}! It happens!",
      "Maybe double-check next time, {name}?",
    ],
    medium: [
      "Penalty snap, {name}. Costly.",
      "That snap didn't land, {name}.",
      "The pile says no, {name}.",
    ],
    hard: [
      "Wrong snap, {name}. Predictable.",
      "Penalty card — as expected from you, {name}.",
      "Snapped like you tarp, {name} — flat wrong.",
    ],
  },
  nice_snap: {
    easy: [
      "Great snap, {name}!",
      "Nice one, {name} — clean snap!",
      "Wow, quick snap, {name}!",
    ],
    medium: [
      "Clean snap, {name}.",
      "Sharp eyes on that one, {name}.",
      "Good snap, {name}.",
    ],
    hard: [
      "Lucky snap, {name}.",
      "Fine, {name}. You can snap once.",
      "Don't get cocky, {name} — one snap means nothing.",
    ],
  },
  opponent_snap: {
    easy: [
      "Bold snap on their card, {name}!",
      "Wow, {name}, stealing a snap — brave!",
      "That was a gutsy snap, {name}!",
    ],
    medium: [
      "Sniping their card, {name}. Risky.",
      "Aggressive snap, {name}.",
      "Going after their hand, {name} — bold.",
    ],
    hard: [
      "Snapping their card won't save your hand, {name}.",
      "Cute aggression, {name}. Still losing.",
      "Take their card, {name}. You'll still lose.",
    ],
  },
  snap_streak: {
    easy: [
      "Snap snap snap — you're on fire, {name}!",
      "Multiple snaps, {name}! Amazing!",
      "You're snapping everything, {name}!",
    ],
    medium: [
      "Snap streak, {name}. Respect.",
      "On a roll with those snaps, {name}.",
      "Another snap, {name}? Okay, I see you.",
    ],
    hard: [
      "Snap streak, {name}? Still won't beat me.",
      "Keep snapping, {name}. I'll still win.",
      "Multiple snaps and still behind, {name}. Sad.",
    ],
  },
  called_cambio: {
    easy: [
      "Cambio, {name}! Good luck everyone!",
      "{name} called it — here we go!",
      "Cambio time, {name}!",
    ],
    medium: [
      "Cambio called by {name}. Final turns.",
      "{name} thinks they're ready.",
      "Cambio, {name} — let's see those hands.",
    ],
    hard: [
      "Cambio, {name}? You're bluffing.",
      "{name} called Cambio too early. Watch.",
      "Cambio won't save that hand, {name}.",
    ],
  },
};

export function pickMoveReactionMessage(
  difficulty: BotDifficulty,
  reaction: GameMoveReaction,
): string {
  const pool = MOVE_REACTION_MESSAGES[reaction.kind][difficulty];
  const template = pool[Math.floor(Math.random() * pool.length)] ?? pool[0];
  return fillPlayerName(template, reaction.playerName);
}
