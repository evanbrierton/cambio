<!-- orchestrate handoff
task: verify-expo-ci-fixes
branch: `orch/expo-gametable/expo-ci-fixes` (commit `ce1ec07` — verifier artifacts only; no target source changes)
agentId: bc-ee3a85ba-f465-4590-a358-66f4ebfafda6
runId: run-fab96f6c-30f2-4c82-add7-41b191df2410
resultStatus: finished
finishedAt: 2026-08-25T17:59:42.890Z
-->

## Verification
live-ui-verified

## Target
`expo-ci-fixes` on branch `orch/expo-gametable/expo-ci-fixes`

## Branch
`orch/expo-gametable/expo-ci-fixes` (commit `ce1ec07` — verifier artifacts only; no target source changes)

## Execution
- `pnpm install` → exit 0 (733 packages, lockfile up to date)
- `pnpm typecheck` → exit 0
- `pnpm --filter @cambio/client typecheck` → exit 0
- `pnpm --filter @cambio/expo typecheck` → exit 0
- `pnpm party:dev` → wrangler ready on `http://0.0.0.0:8787`
- `pnpm --filter @cambio/expo web -- --port 8081` → Metro started; **Web Bundled 5786ms (863 modules)**, no `react-native-worklets/plugin` error
- Manual: open `http://localhost:8081`, create game as "VerifierPlayer" → lobby shows room code + player list with green **Connected** status
- Manual: observe lobby 10+ seconds (twice) + 12s screen recording → **Connected** stable, no flicker/disconnect storm; console shows single `[expo-index] connected to PartyServer` message
- Manual: switch theme to **Cocoa Night** → background updates immediately
- Manual: F5 reload → Cocoa Night selection and styling persist
- Party server logs during lobby: one `101 Switching Protocols` per room (`/parties/main/i5wchh`, `/parties/main/ailmdv`); no rapid reconnect loop
- Artifacts committed to `bootstrap/verifier/` and pushed

## Findings
Per acceptance criterion:
- [x] `pnpm typecheck` passes at repo root: exit 0
- [x] `pnpm --filter @cambio/client typecheck` passes: exit 0 (wire-schema resolves)
- [x] Expo Metro web bundle succeeds: 863 modules bundled, HTTP 200 on `http://localhost:8081`
- [x] Expo web lobby renders player list without WS storm: stable Connected for 10–12s; single WS upgrade per room in party logs (met)

Other findings (severity-ordered):
- (low) Expo compatibility warnings for React 19.2.8 / async-storage versions vs Expo 52 expected React 18.3.1 — bundle and lobby still work
- (low) Party wrangler logs occasional `Network connection lost` on page navigation/cleanup; not a reconnect storm during stable lobby view
- (low) Favicon 404 on Expo web — cosmetic only

## Notes & suggestions
- Worker’s NativeWind 4.1.23 pin (avoiding worklets plugin) is validated: Metro web bundles cleanly without extra hoisting config.
- WS reconnect fix confirmed: lobby stays connected; no UI/console reconnect cycling.
- Verifier artifacts: `bootstrap/verifier/expo-ci-fixes-execution.log`, `expo-ci-fixes-report.md`, `verifier-expo-lobby-stable.webp`, `verifier-expo-lobby-no-storm.mp4`; theme screenshots at `/opt/cursor/artifacts/verifier-expo-theme-cocoa.webp` and `verifier-expo-theme-persisted.webp`.
- PR #244 remains stacked on `orch/expo-gametable/stack-expo-prs` (#243); merge stack branch before or retarget base.