# Project priority discovery

Canonical sequencing lives in Linear: [Project priority order](https://linear.app/ebrierton-cambio/document/project-priority-order-67a9122bb396).

## Current order (summary)

1. Polish
2. GameHost extract (Offline P2P Phase 0) — CAM-19/20/21
3. Matchmaking v1 — CAM-50 epic
4. **Tutorial** — CAM-65 epic (this slice)
5. Mobile Phase 0–1
6. Defer: Offline LAN/WebRTC, native shells

## Tutorial scope (CAM-65)

Client-only first-visit onboarding:

- CAM-66: `localStorage` persistence + `useTutorial` hook
- CAM-67: `react-joyride` v3 `TutorialCoach` (DOM-only, Capacitor-first)
- CAM-68: Landing `TutorialModal` + **How to play** on home
- CAM-69: `/rules` page from shared `rules-content`
- CAM-70: `GameTable` integration with `data-tutorial` selectors
- CAM-71: Skip/Escape, focus trap, motion, mobile polish

Persistence keys: `cambio-tutorial-home-seen`, `cambio-tutorial-game-seen` (`"0"` / `"1"`).

## Dependencies

Tutorial targets home (`/`) and in-game `GameTable` after polish and matchmaking layers are stable. No PartyServer / backend changes.
