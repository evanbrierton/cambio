/// <reference types="@cloudflare/workers-types" />

interface Env {
  Main: DurableObjectNamespace<import("./cambio").CambioParty>;
  Matchmaking: DurableObjectNamespace<import("./matchmaking").MatchmakingParty>;
  /** Groq API key for LLM bot chat (set via `wrangler secret put GROQ_API_KEY` or `.dev.vars`). */
  GROQ_API_KEY?: string;
}
