/// <reference types="@cloudflare/workers-types" />

interface Env {
  Main: DurableObjectNamespace<import("./cambio").CambioParty>;
  /** Vercel AI Gateway API key for LLM bot chat (Workers-compatible; not OIDC). */
  AI_GATEWAY_API_KEY?: string;
}
