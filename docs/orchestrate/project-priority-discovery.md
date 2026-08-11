# Project priority discovery

Canonical sequencing lives in Linear: [Project priority order](https://linear.app/ebrierton-cambio/document/project-priority-order-67a9122bb396).

## Current order (summary)

1. Polish
2. GameHost extract (Offline P2P Phase 0) — CAM-19/20/21
3. Matchmaking v1 — CAM-50 epic
4. **Tutorial** — CAM-65 epic (this slice)
5. Mobile Phase 0–1
6. Defer: Offline LAN/WebRTC, native shells

## Matchmaking v1 scope

Design: [Matchmaking v1 design](https://linear.app/ebrierton-cambio/document/matchmaking-v1-design-43b3ec2d1df6)

- CAM-51: MatchmakingParty DO with FIFO `(targetSize, fillWithBots)` buckets
- CAM-52: Matchmade rooms auto-start with optional bot fill (no host Start)
- CAM-53/54: Find Match client flow + matchmade lobby UI
- Deferred: CAM-61 rematch, CAM-59 regional routing, CAM-62 bot difficulty on matchmaking screen

Matchmaking builds on thin `CambioParty` + transport-agnostic `GameHost` from Phase 0 (`evanbrierton/gamehost-phase0-5425`).

## Tutorial scope (CAM-65)

Client-only first-visit onboarding:

- CAM-66: `localStorage` persistence + `useTutorial` hook
- CAM-67: `react-joyride` v3 `TutorialCoach` (DOM-only, Capacitor-first)
- CAM-68: Landing `TutorialModal` + **How to play** on home
- CAM-69: `/rules` page from shared `rules-content`
- CAM-70: `GameTable` integration with `data-tutorial` selectors
- CAM-71: Skip/Escape, focus trap, motion, mobile polish

Persistence keys: `cambio-tutorial-home-seen`, `cambio-tutorial-game-seen` (`"0"` / `"1"`).

Tutorial targets home (`/`) and in-game `GameTable` after polish and matchmaking layers are stable. No PartyServer / backend changes.
