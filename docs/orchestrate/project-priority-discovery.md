# Project priority discovery

Source: [Linear — Project priority order](https://linear.app/ebrierton-cambio/document/project-priority-order-67a9122bb396)

## Mobile Phase 0–1 (CAM-33–37) — this branch

| Issue | Title | Status on branch |
|-------|-------|------------------|
| CAM-33 | PWA audit/hardening | Audit doc + manifest/SW/audio unlock |
| CAM-34 | Storage/theme/sound adapters | `@cambio/client/platform` |
| CAM-35 | Monorepo workspaces | `packages/*` in pnpm workspace |
| CAM-36 | `packages/game` extract | Engine/bot/types in `@cambio/game` |
| CAM-37 | `packages/client` extract | Hook + party + adapters in `@cambio/client` |

**Deferred:** CAM-38+ Capacitor/Expo shells.

**Host model:** PartyServer `CambioParty` durable object (no separate GameHost symbol).

## Upstream (not on this branch)

- Tutorial v1: `evanbrierton/tutorial-v1-9adb`
- Matchmaking v1: separate branch — rebase/stack after landing
