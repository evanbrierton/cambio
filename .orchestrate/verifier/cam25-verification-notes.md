# CAM-25 Verifier Notes

## Automated (2026-08-24)

- `pnpm test src/game/host.test.ts` → 22/22 pass
- `pnpm test src/hooks/useHostReliability.test.ts` → 5/5 pass
- `pnpm test src/hooks/useP2PConnection.test.ts` → 7/7 pass (regression)
- `pnpm typecheck` → FAIL: GameTable.tsx(1003) null passed to Set.has

## Manual browser (localhost:3000)

### Host solo — Wake Lock + visibility

URL: `/play/cam25-verify?mode=local&host=1&name=Alice&solo=1&bots=1&difficulty=easy`

- Wake Lock API on Chrome localhost: `{ supported: true }`
- `document.visibilityState` initially `"visible"`
- Dispatched synthetic `visibilitychange` with `visibilityState` overridden to hidden/visible; host UI responded (no console errors)

### Guest paused banner — live UI blocked

URL pair with dev-bridge endpoint `127.0.0.1:9876`:

- Host lobby loads
- Guest shows **"LOST CONNECTION TO HOST."** — SharedWorker dev-bridge did not establish guest session in automated Chrome session
- `host.test.ts` test "pauses snap timers and broadcasts hostPaused when host tab is hidden" covers guest broadcast via mock peer

### Online isolation

URL: `/play/online-verify?name=OnlineTest`

- Uses `useGameConnection` (no `mode=local`)
- Shows generic server connection error only; no "Keep this tab open while hosting" or other local-host reliability copy
