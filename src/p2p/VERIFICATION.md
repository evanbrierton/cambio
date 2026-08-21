# CAM-22 LAN WebSocket P2P transport — verifier audit

Verified on branch `orch/project-priority/lan-p2p-transport` (HEAD 5597c5e).

## Commands run
- `pnpm test` → 25 files, 211 tests passed (0 fail).
- `pnpm test src/p2p/lan-transport.test.ts` (verbose) → 4/4 passed: serialization round-trip, host fan-out + guest receive + client-message collection, heartbeat disconnect within 5s, inert unless mode local.
- `pnpm typecheck` → clean (0 errors).
- `pnpm lint` → clean (biome + tailwind-lint, no issues).

## Invariant checks
- `git diff --name-only c151fd7..HEAD` → only `src/p2p/{types.ts,lan-transport.ts,lan-transport.test.ts}` changed.
- `getPartyHost` lives in `src/lib/party.ts`, `packages/client/src/party.ts`, `useGameConnection.ts` — none present in the branch diff (online PartySocket path untouched).
- No file outside `src/p2p/**` imports the transport → inert unless explicitly activated via `mode === "local"` entry points (`createLanHostRelay` / `createLanGuestTransport` return `null` otherwise).
- Default port `DEFAULT_LAN_PORT = 9876` (distinct from PartyKit `8787`); guest URL `ws://{hostIp}:{port}/room/{roomId}`.
- Serialization reuses `@cambio/game/wire-schema` parsers (`parseClientMessage(Json)`, `parseServerMessage(Json)`); no forked message shapes.

Verdict: unit-test-verified.
