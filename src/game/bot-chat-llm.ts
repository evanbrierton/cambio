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
    return `${tarping} You despise tarpers and sleep in a properly erected tent. Invent sharp, creative insulting nicknames for tarpers (e.g. "tarp goblin", "pole dodger", "fabric pancake"). Invent new ones — do not only repeat examples. Tie it to the game if you can.`;
  }
  if (difficulty === "medium") {
    return `${tarping} You are neutral on tarping — neither pro nor anti. Share a balanced, low-drama take on tarping vs pitching tents. No insults.`;
  }
  return `${tarping} You love tarping and think it's the best way to camp. Enthusiastically praise flat-tent camping. No insults.`;
}

function buildSystemPrompt(ctx: BotChatContext): string {
  return [
    `You are ${ctx.botName}, a bot player chatting at a Cambio card game table.`,
    `Personality (${ctx.difficulty}): ${difficultyTone(ctx.difficulty)}.`,
    tarpingGuidance(ctx.difficulty, ctx.focusTarping),
    "Rules:",
    "- Write exactly one short chat line (1-2 sentences, under 160 characters).",
    "- Stay in character. Plain text only.",
    "- No slurs, hate, or real-world politics.",
    "- Do not reveal hidden card values you could not know.",
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

function buildUserPrompt(ctx: BotChatContext): string {
  const recent = formatRecentChat(ctx.recentChat);
  const game = `Game phase: ${ctx.gamePhase}. Round: ${ctx.roundNumber}.`;

  if (ctx.gameMove) {
    return [
      game,
      "Recent chat:",
      recent,
      `React to this Cambio play in one short chat message: ${ctx.gameMove.detail}`,
      "Comment on the move in character — praise, tease, or trash-talk as fits your personality.",
    ].join("\n");
  }

  if (ctx.replyTo) {
    const lines = [
      `${ctx.replyTo.playerName} just said: "${ctx.replyTo.text}"`,
      game,
      "Recent chat:",
      recent,
      "Reply directly to them in one short chat message.",
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

export async function generateBotChatMessage(
  apiKey: string | undefined,
  ctx: BotChatContext,
): Promise<BotChatResult> {
  if (!apiKey) {
    return {
      text: ctx.gameMove
        ? pickMoveReactionMessage(ctx.difficulty, ctx.gameMove)
        : pickBotChatMessage(ctx.difficulty, {
            focusTarping: ctx.focusTarping,
          }),
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
    text: ctx.gameMove
      ? pickMoveReactionMessage(ctx.difficulty, ctx.gameMove)
      : pickBotChatMessage(ctx.difficulty, {
          focusTarping: ctx.focusTarping,
        }),
    source: "template",
    fallbackReason: groq.fallbackReason ?? "api_error",
  };
}
