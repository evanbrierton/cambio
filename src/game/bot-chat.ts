import type { BotDifficulty } from "./types";

const EASY_MESSAGES = [
  "Good luck everyone! :)",
  "Having so much fun playing with you!",
  "Love this game — thanks for the company!",
  "You're doing great out there!",
  "What a cozy game night!",
  "Take your time, no rush at all!",
  "Hope you're having as much fun as I am!",
  "Such a friendly table!",
  "Great moves — keep it up!",
  "This is my favorite way to practice!",
  "Sending good vibes your way!",
  "Nice to meet you at the table!",
  "Every round is a good round with friends!",
  "You've got this!",
  "What a lovely hand we're all building!",
];

const MEDIUM_MESSAGES = [
  "Let's see what you've got.",
  "Interesting move.",
  "Card games are the best.",
  "Hmm, curious choice.",
  "My turn soon.",
  "Classic Cambio.",
  "The discard pile is looking spicy.",
  "Anyone else feeling lucky?",
  "Solid round so far.",
  "Stay focused out there.",
  "Could go either way from here.",
  "Keeping an eye on that discard.",
  "Not bad, not bad.",
  "The tension is real.",
  "Let's play it out.",
];

const HARD_MESSAGES = [
  "You're about to lose.",
  "Too slow. I've already won.",
  "Pathetic hand. Mine's better.",
  "Give up now while you still can.",
  "Watch and learn.",
  "Embarrassing.",
  "I've seen toddlers play better.",
  "This is a joke to me.",
  "You really thought you could beat me?",
  "Keep trying. It's cute.",
  "You're out of your depth.",
  "Is that your best move?",
  "I'm not even trying and I'm ahead.",
  "Save yourself the humiliation.",
  "Another mistake. Shocking.",
];

function pick<T>(items: T[]): T {
  return items[Math.floor(Math.random() * items.length)];
}

export function pickBotChatMessage(difficulty: BotDifficulty): string {
  if (difficulty === "hard") return pick(HARD_MESSAGES);
  if (difficulty === "medium") return pick(MEDIUM_MESSAGES);
  return pick(EASY_MESSAGES);
}

/** Random delay before the next bot chat message (ms). */
export function botChatDelay(): number {
  return 25_000 + Math.floor(Math.random() * 45_000);
}
