import { mentionsTarping, pickBotChatMessage } from "./bot-chat";
import {
  type GameMoveReaction,
  pickMoveReactionMessage,
} from "./bot-chat-events";
import type { BotDifficulty, ChatMessage, GamePhase } from "./types";

const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";
const GROQ_MODEL = "llama-3.1-8b-instant";
const MAX_CHAT_CHARS = 200;

export type BotChatFallbackReason =
  | "no_api_key"
  | "rate_limit"
  | "api_error"
  | "empty_response"
  | "message_too_long"
  | "network_error";

export type BotChatContext = {
  difficulty: BotDifficulty;
  botName: string;
  /** Exact table display names for everyone at the table (humans + bots). */
  playerNames: string[];
  recentChat: ChatMessage[];
  gamePhase: GamePhase;
  roundNumber: number;
  replyTo?: { playerName: string; text: string };
  gameMove?: GameMoveReaction;
  focusTarping: boolean;
};

export type BotChatResult = {
  text: string;
  source: "groq" | "template";
  fallbackReason?: BotChatFallbackReason;
};

type GroqChatResponse = {
  choices?: Array<{
    message?: {
      content?: string;
    };
  }>;
};

function difficultyTone(difficulty: BotDifficulty): string {
  if (difficulty === "hard") {
    return "smug, trash-talking, and arrogant — you look down on other players";
  }
  if (difficulty === "medium") {
    return "chill and observational, mildly competitive";
  }
  return "warm, encouraging, and wholesome";
}

function tarpingGuidance(
  difficulty: BotDifficulty,
  focusTarping: boolean,
): string {
  const tarping =
    "Tarping means camping under an un-erected, collapsed, or flat tent instead of pitching it with poles.";
  if (!focusTarping) {
    return "Focus on the card game. Do not mention tarping or camping unless it fits very naturally.";
  }
  if (difficulty === "hard") {
    return `${tarping} You despise tarpers and sleep in a properly erected tent. You may trash-talk tarping with creative insults (e.g. calling someone's camping style "tarp goblin energy"), but always address people by their exact table display names — never invent, replace, or nickname a player's name.`;
  }
  if (difficulty === "medium") {
    return `${tarping} You are neutral on tarping — neither pro nor anti. Share a balanced, low-drama take on tarping vs pitching tents. No insults.`;
  }
  return `${tarping} You love tarping and think it's the best way to camp. Enthusiastically praise flat-tent camping. No insults.`;
}

function formatPlayerRoster(names: string[]): string {
  if (names.length === 0) return "(no players listed)";
  return names.join(", ");
}

/** Concise Cambio rules for bot chat — keep short to fit model context. */
export const CAMBIO_RULES_FOR_CHAT = [
  "Cambio rules (know these; do not lecture unless asked):",
  "- Goal: lowest hand points when someone calls Cambio. 4 face-down cards each.",
  "- Turn: draw from deck or discard. Deck draw: swap into hand OR discard (abilities fire only on deck discard). Discard draw: must swap in; no abilities.",
  "- Points: A=1, 2–10 face, J/Q=10, black K=−2, red K=+25, Joker=0. Keep low; dump red kings/high cards.",
  "- Abilities (deck discard only): 7/8 peek own; 9/10 spy opponent; J blind swap; Q look 1 then swap; K look 2 then swap.",
  "- Snap anytime if a hand card matches discard top. Wrong snap = penalty card. Cambio caller cannot snap; their cards are protected from spy/swap.",
  "- Call Cambio at start of your turn (before drawing); everyone else gets one last turn, then reveal.",
].join("\n");

/** What other players (including bots) can see at the table. */
export const CAMBIO_VISIBILITY_FOR_CHAT = [
  "Card visibility (critical — never break this):",
  "- PUBLIC: top of discard pile, face-up cards, cards just discarded onto the discard pile, cards taken from the discard pile (everyone already saw them).",
  "- PRIVATE: face-down hand cards, cards drawn from the deck while held or swapped into a hand, peek/spy results, penalty cards.",
  "- Only name ranks/suits of PUBLIC cards. Never invent or guess private card identities.",
  "- Never mention point values of cards that are or were face-down in someone's hand. Do not tally or imply hidden hand totals.",
  "- If a player swapped a deck draw into their hand, do not comment on what they took or how good/bad that swap was — you cannot know.",
].join("\n");

export function buildSystemPrompt(ctx: BotChatContext): string {
  return [
    `You are ${ctx.botName}, a bot player chatting at a Cambio card game table.`,
    `Personality (${ctx.difficulty}): ${difficultyTone(ctx.difficulty)}.`,
    `Players at the table (use these exact names): ${formatPlayerRoster(ctx.playerNames)}.`,
    tarpingGuidance(ctx.difficulty, ctx.focusTarping),
    CAMBIO_RULES_FOR_CHAT,
    CAMBIO_VISIBILITY_FOR_CHAT,
    "Chat rules:",
    "- Write exactly one short chat line (1-2 sentences, under 160 characters).",
    "- Stay in character. Plain text only.",
    "- When addressing or referring to a player, use their exact table display name from the roster. Never invent, misspell, shorten, or replace a player's name with a nickname or insult-as-name.",
    "- No slurs, hate, or real-world politics.",
    "- Do not wrap the message in quotation marks.",
  ].join("\n");
}

function formatRecentChat(messages: ChatMessage[]): string {
  if (messages.length === 0) return "(no recent messages)";
  return messages
    .slice(-10)
    .map((message) => `${message.playerName}: ${message.text}`)
    .join("\n");
}

function addressNameForFallback(ctx: BotChatContext): string | undefined {
  if (ctx.gameMove?.playerName) return ctx.gameMove.playerName;
  if (ctx.replyTo?.playerName) return ctx.replyTo.playerName;
  return ctx.playerNames.find((name) => name !== ctx.botName);
}

function buildUserPrompt(ctx: BotChatContext): string {
  const recent = formatRecentChat(ctx.recentChat);
  const game = `Game phase: ${ctx.gamePhase}. Round: ${ctx.roundNumber}.`;

  if (ctx.gameMove) {
    return [
      game,
      "Recent chat:",
      recent,
      `React to this Cambio play in one short chat message: ${ctx.gameMove.detail}`,
      `Address the player as "${ctx.gameMove.playerName}" — that is their exact table name.`,
      "Comment on the move in character — praise, tease, or trash-talk as fits your personality.",
      "The move detail above only includes publicly visible information. Do not invent or name any other cards.",
    ].join("\n");
  }

  if (ctx.replyTo) {
    const lines = [
      `${ctx.replyTo.playerName} just said: "${ctx.replyTo.text}"`,
      game,
      "Recent chat:",
      recent,
      `Reply directly to ${ctx.replyTo.playerName} using that exact name.`,
    ];
    if (ctx.focusTarping && mentionsTarping(ctx.replyTo.text)) {
      lines.push(
        "They brought up tarping or camping — respond in character about it.",
      );
    }
    return lines.join("\n");
  }

  if (
    ctx.focusTarping &&
    ctx.recentChat.some((message) => mentionsTarping(message.text))
  ) {
    return [
      game,
      "Recent chat:",
      recent,
      "The table is discussing tarping or camping — chime in with your take in one short message.",
    ].join("\n");
  }

  return [
    game,
    "Recent chat:",
    recent,
    "Write your next casual chat message for the table.",
  ].join("\n");
}

function sanitizeBotReply(raw: string): string | null {
  let text = raw.trim();
  if (!text) return null;

  if (
    (text.startsWith('"') && text.endsWith('"')) ||
    (text.startsWith("'") && text.endsWith("'"))
  ) {
    text = text.slice(1, -1).trim();
  }

  text = text.replace(/\s+/g, " ").trim();
  if (!text) return null;
  if (text.length > MAX_CHAT_CHARS) return null;
  return text;
}

async function callGroq(
  apiKey: string,
  system: string,
  user: string,
): Promise<{ text: string | null; fallbackReason?: BotChatFallbackReason }> {
  try {
    const response = await fetch(GROQ_API_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: GROQ_MODEL,
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
        max_tokens: 80,
        temperature: 0.9,
      }),
    });

    if (response.status === 429) {
      return { text: null, fallbackReason: "rate_limit" };
    }
    if (!response.ok) {
      return { text: null, fallbackReason: "api_error" };
    }

    const data = (await response.json()) as GroqChatResponse;
    const raw = data.choices?.[0]?.message?.content;
    if (!raw) {
      return { text: null, fallbackReason: "empty_response" };
    }

    const text = sanitizeBotReply(raw);
    if (!text) {
      return { text: null, fallbackReason: "message_too_long" };
    }

    return { text };
  } catch {
    return { text: null, fallbackReason: "network_error" };
  }
}

function templateFallbackText(ctx: BotChatContext): string {
  if (ctx.gameMove) {
    return pickMoveReactionMessage(ctx.difficulty, ctx.gameMove);
  }
  return pickBotChatMessage(ctx.difficulty, {
    focusTarping: ctx.focusTarping,
    playerName: addressNameForFallback(ctx),
  });
}

export async function generateBotChatMessage(
  apiKey: string | undefined,
  ctx: BotChatContext,
): Promise<BotChatResult> {
  if (!apiKey) {
    return {
      text: templateFallbackText(ctx),
      source: "template",
      fallbackReason: "no_api_key",
    };
  }

  const groq = await callGroq(
    apiKey,
    buildSystemPrompt(ctx),
    buildUserPrompt(ctx),
  );
  if (groq.text) {
    return { text: groq.text, source: "groq" };
  }

  return {
    text: templateFallbackText(ctx),
    source: "template",
    fallbackReason: groq.fallbackReason ?? "api_error",
  };
}
