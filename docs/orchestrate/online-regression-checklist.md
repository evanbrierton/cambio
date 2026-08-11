# Online regression checklist (CAM-21)

Manual smoke tests to run before merging Offline P2P Phase 0 (GameHost extract). Online mode must behave identically to pre-extraction.

## Prerequisites

- `pnpm dev` (Next.js) and party worker running (`pnpm party:dev` or equivalent)
- Two browser windows or profiles for multiplayer tests

## Checklist

- [ ] **Create room, join from second browser** — Host creates a room; guest joins with a different name. Both see lobby and can start a game.
- [ ] **Full round with peek, swap, snap, Cambio** — Play through setup peek, normal draws/swaps, at least one snap attempt, and a Cambio call. Scores and round end behave as before.
- [ ] **Solo mode with bots** — Start solo from lobby with bots enabled. Bots take turns and chat (template fallback OK without API key).
- [ ] **Reconnect after refresh** — Mid-game, refresh one player's tab. Player rejoins same seat with consistent hand/state.

## Automated gate (CI)

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm party:check
```

## Notes

- Phase 0 does not add LAN/WebRTC or `useP2PConnection`.
- Durable Object alarms still drive snap windows in online mode; `GameHost` uses adapter callbacks for Cloudflare scheduling.
