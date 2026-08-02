/// <reference types="@cloudflare/workers-types" />

interface Env {
  Main: DurableObjectNamespace<import("./cambio").CambioParty>;
}
