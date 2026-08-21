export type RulesSection = {
  id: string;
  title: string;
  paragraphs: string[];
  bullets?: string[];
};

export const rulesSections: RulesSection[] = [
  {
    id: "objective",
    title: "Objective",
    paragraphs: [
      "The goal is to end the round with the lowest total point value in your 4-card hand.",
      'The round ends when one player calls "Cambio" — then everyone counts points and the lowest score wins.',
      "Each player gets one chance before the first draw to peek at 2 of their own cards and memorize them. After that you may not peek again unless you pull a 7 or 8.",
    ],
  },
  {
    id: "setup",
    title: "Setup",
    bullets: [
      "Shuffle a standard 54-card deck (52 cards plus 2 jokers).",
      "Deal 4 cards face down to each player in a 2×2 grid.",
      "Place the remaining deck face down in the center, with room for a discard pile.",
      "Before play, each player may peek at 2 of their own cards — once.",
    ],
    paragraphs: [],
  },
  {
    id: "turn",
    title: "Your Turn",
    bullets: [
      "Draw the top card from the deck or the discard pile.",
      "From the deck: swap it with one of your face-down cards (old one goes face-up on the discard pile), or discard it directly. If you discard it and it has a special ability, the ability triggers now.",
      "From the discard pile: you must swap it with one of your face-down cards. You cannot place the drawn card back on the discard pile, and special abilities do not apply.",
      "Play passes to the next player on the left.",
    ],
    paragraphs: [],
  },
  {
    id: "points",
    title: "Point Values",
    paragraphs: [
      "Number cards (2–10) are always face value. The host can configure point values for aces, jacks/queens, jokers, and black/red kings from the lobby before play starts.",
    ],
    bullets: [
      "2 – 10: face value",
      "Jack / Queen: 10 (default)",
      "King ♣ ♠ (black): −2 (default)",
      "King ♥ ♦ (red): +25 (default)",
      "Ace: 1 (default)",
      "Joker: 0 (default)",
    ],
  },
  {
    id: "specials",
    title: "Special Cards",
    paragraphs: [
      "When you discard one of these after drawing from the deck, its ability activates. Swap it into your hand instead and nothing triggers. Cards drawn from the discard pile never trigger abilities.",
    ],
    bullets: [
      "7 or 8 — Peek: look at one of your own face-down cards in secret.",
      "9 or 10 — Spy: look at one of another player's face-down cards in secret.",
      "Jack — Blind switch: swap one of your cards with another player's without looking first.",
      "Queen — Look & switch: look at one card anywhere, then swap one of your cards with another player's.",
      "Any King — Look & switch: look at 2 cards anywhere, then swap one of your cards with another player's.",
      "After Cambio is called, the caller's cards cannot be targeted by Spy or swap abilities, and the caller cannot snap.",
    ],
  },
  {
    id: "snap",
    title: "Snapping",
    paragraphs: [
      "If a card in your hand matches the top of the discard pile, you may snap it at any time — even on another player's turn. First to snap wins.",
      "A correct snap lets you discard one more card; a wrong snap costs you a penalty card placed face down in your hand.",
      "Only one player may snap per discarded card. A player who has called Cambio cannot snap.",
    ],
  },
  {
    id: "penalties",
    title: "Penalties",
    paragraphs: [
      "You receive an extra penalty card for a wrong snap. The penalty card is placed face down in your hand — you are not shown its value.",
    ],
  },
  {
    id: "winning",
    title: "Winning",
    paragraphs: [
      'Call "Cambio" at the start of your turn — before drawing from the deck or discard pile. Every other player gets one final turn, then all hands are revealed and the lowest total wins.',
      "If there is a tie, the player who didn't call Cambio wins. If two non-callers tie, the player with the least-value cards wins.",
    ],
  },
];

export const rulesIntro =
  "Cambio — also known as Cabo, Pablo, or Cactus — is a card game for 2+ players using a standard 54-card deck. Rounds play fast, usually 10–20 minutes.";
