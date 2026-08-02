import { routePartykitRequest } from "partyserver";
import { CambioParty } from "./cambio";

export { CambioParty };

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    return (
      (await routePartykitRequest(request, env, { cors: true })) ??
      new Response("Not Found", { status: 404 })
    );
  },
} satisfies ExportedHandler<Env>;
