import { afterEach, describe, expect, it, vi } from "vitest";
import {
  AI_GATEWAY_CHAT_URL,
  AI_GATEWAY_MODEL,
  generateBotChatMessage,
} from "./bot-chat-llm";

const baseCtx = {
  difficulty: "easy" as const,
  botName: "Peppy Clover",
  recentChat: [],
  gamePhase: "playing" as const,
  roundNumber: 1,
  focusTarping: false,
};

describe("generateBotChatMessage (AI Gateway)", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("falls back to templates when API key is missing", async () => {
    const result = await generateBotChatMessage(undefined, baseCtx);

    expect(result.source).toBe("template");
    expect(result.fallbackReason).toBe("no_api_key");
    expect(result.text.length).toBeGreaterThan(0);
  });

  it("uses Vercel AI Gateway OpenAI-compatible endpoint", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          choices: [{ message: { content: "Nice draw, friend." } }],
        }),
        { status: 200 },
      ),
    );

    const result = await generateBotChatMessage("gateway-key", baseCtx);

    expect(result.source).toBe("gateway");
    expect(result.text).toBe("Nice draw, friend.");
    expect(fetchMock).toHaveBeenCalledOnce();
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe(AI_GATEWAY_CHAT_URL);
    expect(init.method).toBe("POST");
    expect(init.headers).toMatchObject({
      Authorization: "Bearer gateway-key",
      "Content-Type": "application/json",
    });
    const body = JSON.parse(String(init.body));
    expect(body.model).toBe(AI_GATEWAY_MODEL);
    expect(body.model).toMatch(/^groq\//);
  });

  it("falls back on rate limit (429)", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response("rate limited", { status: 429 }),
    );

    const result = await generateBotChatMessage("gateway-key", baseCtx);

    expect(result.source).toBe("template");
    expect(result.fallbackReason).toBe("rate_limit");
  });

  it("falls back on API error", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response("bad request", { status: 400 }),
    );

    const result = await generateBotChatMessage("gateway-key", baseCtx);

    expect(result.source).toBe("template");
    expect(result.fallbackReason).toBe("api_error");
  });

  it("falls back on network error", async () => {
    vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("offline"));

    const result = await generateBotChatMessage("gateway-key", baseCtx);

    expect(result.source).toBe("template");
    expect(result.fallbackReason).toBe("network_error");
  });
});
