<!-- orchestrate handoff
task: verify-capacitor-shell
branch: `orch/project-priority/capacitor-shell` (no commits added — I only ran verification; nothing to commit)
agentId: bc-d7696ff9-23c8-4414-ab82-eafdeaa2338e
runId: run-07dad20e-cb2a-4e33-8d46-76c57aca6067
resultStatus: finished
finishedAt: 2026-08-21T16:36:51.514Z
-->

I've completed end-to-end verification. Working tree is clean, no verifier artifacts needed to commit.

## Verification
type-check-only

## Target
`capacitor-shell` on branch `orch/project-priority/capacitor-shell`

## Branch
`orch/project-priority/capacitor-shell` (no commits added — I only ran verification; nothing to commit)

## Execution
- `git diff --name-only origin/main...HEAD` → only 7 files: `apps/native/{.gitignore,README.md,capacitor.config.ts,package.json,tsconfig.json,web/.gitkeep}` + `pnpm-workspace.yaml`. No `src/`, `packages/`, or `party/` changes.
- `pnpm install` (root, default) → exit 0; resolves all 4 workspace projects incl. `@cambio/native`.
- `pnpm ls -r --depth -1` → confirms `@cambio/native@0.1.0` at `apps/native`.
- `pnpm typecheck` (root) → exit 0.
- `pnpm lint` (root, biome + tailwind-lint) → exit 0, "No issues found", 145 files.
- `pnpm --filter @cambio/native typecheck` → exit 0 (validates `capacitor.config.ts` is valid TS).
- `pnpm test` (vitest) → 24 files, **207 passed**, exit 0 (online/game path intact).
- `npx cap doctor` → exit 0; all `@capacitor/*` 8.5.0 deps installed.
- `npx cap sync` → exit 0.
- Loaded the real config via `@capacitor/cli` `loadConfig()` under env overrides → precedence works: default `http://localhost:3000` (cleartext auto-true); `CAPACITOR_SERVER_URL` → `https://cambio.example.com` (cleartext false); `NEXT_PUBLIC_APP_URL` → staging; `VERCEL_URL` → `https://deploy-xyz…`; LAN http auto-enables cleartext and adds the host to `allowNavigation`.
- `npx cap add android` + `npx cap add ios` → both exit 0; each detected the 2 plugins (splash-screen, status-bar); generated `capacitor.config.json` carries `server.url`, `cleartext`, and full `allowNavigation`. Folders are gitignored (`git status --ignored` confirms `!! ios/`, `!! android/`); removed after test.
- **CI blocker check**: reset `pnpm-lock.yaml` to committed HEAD, ran `pnpm install --frozen-lockfile` → **exit 1** `ERR_PNPM_OUTDATED_LOCKFILE` (6 `@capacitor/*` deps added but not in lockfile).

## Findings
Per acceptance criterion:
- [x] **apps/native is a valid Capacitor project wired into the workspace**: `package.json` (`@cambio/native`), `capacitor.config.ts`, `tsconfig.json` present; resolves as a pnpm workspace project; `pnpm-workspace.yaml` adds `apps/*`; `cap doctor`/`cap sync` succeed. (met)
- [x] **Remote-URL mode loads existing web UI; URL documented + overridable**: `server.url` env precedence mirrors `src/lib/site.ts` (`NEXT_PUBLIC_APP_URL` → `VERCEL_URL` → `localhost`) plus top-priority `CAPACITOR_SERVER_URL`; verified live under 5 env combinations; README documents all of it. (met)
- [x] **iOS/Android targets generated or reproducibly documented, no fabricated binaries**: `cap add ios`/`cap add android` both succeed reproducibly; native folders gitignored (not committed); README + `cap:add:*` scripts document the flow. No native binaries in the diff. (met)
- [x] **Status bar / safe-area + splash basics handled**: `StatusBar` (`style DARK`, `overlaysWebView:false` for safe-area alignment) and `SplashScreen` config present and propagate into generated native config; plugins `@capacitor/status-bar` + `@capacitor/splash-screen` installed and detected. (met — note safe-area insets themselves are handled by the remote web CSS; the shell provides the non-overlay baseline.)
- [x] **README documents local run (Xcode + Android Studio) + remote-URL vs bundled-export**: present and accurate. (met)
- [x] **`pnpm install` succeeds; web UI/runtime + online WebSocket path unchanged**: default `pnpm install` exit 0; zero changes to `src/`/`packages/`/`party/`; 207 tests pass; PartyServer default host `cambio.brierton.workers.dev` (from `packages/client/src/party.ts`) is exactly allowlisted, and dev host `localhost:8787` covered by `localhost`/`127.0.0.1`. (met)

Other findings (severity-ordered):
- **(high) Committed branch fails `pnpm install --frozen-lockfile`.** `pnpm-lock.yaml` was deliberately not committed (per upstream handoff), but all 5 CI jobs in `.github/workflows/ci.yml` (lint, typecheck, test, worker, build) run `pnpm install --frozen-lockfile` first. I reproduced the failure: `ERR_PNPM_OUTDATED_LOCKFILE … 6 dependencies were added: @capacitor/*`. As-is, this branch will red-X every CI job on the PR. The acceptance criterion "pnpm install succeeds" passes for the default local invocation, but integration will break until the lockfile is committed. Fix is trivial: commit the regenerated `pnpm-lock.yaml` (diff is +800 lines, purely `@capacitor/*` additions — I inspected it).
- **(low) `allowNavigation` has a duplicate `localhost`** entry (once from the resolved default hostname, once hardcoded). Harmless, cosmetic.
- **(low) `NEXT_PUBLIC_PARTYKIT_HOST` override not auto-allowlisted.** If a deployment points the WebSocket at a custom non-`*.workers.dev`/`*.partykit.dev` host via that env var, it wouldn't be in `allowNavigation`. Default and dev paths are fully covered; only a bespoke custom host would need a manual allowlist entry.

## Notes & suggestions
- The scope discipline is clean: changes are strictly confined to `apps/native/**` + the one-line `pnpm-workspace.yaml` edit, so the web app's runtime and PartySocket path are provably unchanged.
- Strongest evidence claim is `type-check-only`: I could not exercise an actual iOS/Android runtime WebView (no Xcode/Android SDK, expected in CI), so remote-URL loading and safe-area rendering weren't confirmed on a device/simulator. Everything runnable in this environment (config resolution, platform generation, plugin wiring, typecheck, lint, tests) passed.
- Recommended follow-up before/at integration: **commit `pnpm-lock.yaml`** so CI's frozen-lockfile install passes — this is the one thing standing between the current branch and green CI. Optionally dedupe the `localhost` allowlist entry.