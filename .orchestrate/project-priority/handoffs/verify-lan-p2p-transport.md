<!-- orchestrate handoff
task: verify-lan-p2p-transport
branch: `orch/project-priority/lan-p2p-transport` (added audit note `src/p2p/VERIFICATION.md`, commit `aa2521f`, pushed)
agentId: bc-b9b0d498-4caa-4e01-8e99-e013b5d598fb
runId: run-1a978e71-e410-433d-9078-5e1b3cbb9261
resultStatus: finished
finishedAt: 2026-08-21T16:35:03.981Z
-->

I've completed the verification. All acceptance criteria are met with running-code evidence.

## Verification
unit-test-verified

## Target
`lan-p2p-transport` on branch `orch/project-priority/lan-p2p-transport`

## Branch
`orch/project-priority/lan-p2p-transport` (added audit note `src/p2p/VERIFICATION.md`, commit `aa2521f`, pushed)

## Execution
- `pnpm test` → 25 files, **211 passed / 0 failed** (1.40s).
- `vitest run src/p2p/lan-transport.test.ts --reporter verbose` → **4/4 passed**: serialization round-trip; host fan-out + guest receive + client-message collection; heartbeat disconnect within 5s; inert unless mode local.
- `pnpm typecheck` (`tsc --noEmit`) → clean, 0 errors.
- `pnpm lint` (`biome check` + tailwind-lint) → 145 files checked, no issues.
- `git diff --name-only c151fd7..HEAD` (branch base = pre-transport commit) → only `src/p2p/{types.ts,lan-transport.ts,lan-transport.test.ts}` changed.
- `rg -l getPartyHost` → present in `src/lib/party.ts`, `packages/client/src/party.ts`, `useGameConnection.ts` — none in the branch diff.
- `rg -l` for p2p imports outside `src/p2p/**` → **NONE** (transport not wired anywhere).
- Read `packages/game/src/wire-schema.ts` → confirmed `parseClientMessage(Json)`/`parseServerMessage(Json)` are the reused parsers.

## Findings
Per acceptance criterion:
- [x] `types.ts` + `lan-transport.ts` implement host relay + guest WS client using existing wire types: `LanHostRelay` (Option B in-tab relay, `registerGuestSocket`/`broadcast`) and `LanGuestTransport` connect to `ws://{hostIp}:{port}/room/{roomId}`; both import `ClientMessage`/`ServerMessage` from `@cambio/game` and parse via `@cambio/game/wire-schema`. **met**
- [x] Heartbeat detects disconnect within 5s + host-tab-close surfaces disconnect to guests: guest sets a `heartbeatTimeoutMs` (default/clamped-max 5000ms) deadline on unanswered ping; test advances 5001ms and observes `heartbeat_timeout`. Host `close()` (also bound to `beforeunload`) sends a `host_closing` frame → guest emits `disconnected reason=host_closed` (asserted in fan-out test). **met**
- [x] Default port 9876; JSON round-trips ClientMessage/ServerMessage: `DEFAULT_LAN_PORT = 9876` (distinct from PartyKit 8787); serialize/deserialize round-trip asserted via `toEqual`, URL asserted as `ws://192.168.1.20:9876/room/room-a`. **met**
- [x] No changes to `getPartyHost()` or PartySocket online path; inert unless mode local: whole-branch diff is p2p-only; `createLanHostRelay`/`createLanGuestTransport` return `null` unless `mode === "local"` (asserted by "is inert" test); nothing imports the transport. **met**
- [x] Focused vitest tests cover serialization, heartbeat/disconnect, fan-out/receive and pass: 4/4 pass. **met**
- [x] Verifier criterion — verification includes execution evidence for every criterion: see above. **met**

Other findings:
- (low) Heartbeat deadline is set to `heartbeatTimeoutMs` (default 5000ms) after the first missing pong, so worst-case detection is at exactly 5s — satisfies "within 5 seconds" but sits at the boundary; a smaller timeout would give margin. No action required for CAM-22.
- (low) True two-device WiFi behavior is not (and per plan, cannot be) exercised in CI; coverage is via in-process mock sockets, which is the agreed scope.

## Notes & suggestions
- No flaky behavior observed; suite is fast and deterministic (fake timers used for the heartbeat test).
- Transport is correctly parked behind local-mode entry points with zero call sites — matches the "transport layer only, no CTA/lobby/home wiring" scope. Follow-up wiring into a local-mode entry point should happen after the Capacitor shell lands, as the author noted.