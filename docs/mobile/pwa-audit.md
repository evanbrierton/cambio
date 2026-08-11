# Cambio mobile web PWA audit (Phase 0.1)

Audit date: 2026-08-11. Scope: installability, reconnect, safe areas, audio, clipboard — **before** native shells (CAM-38+).

## Baseline (pre-hardening)

| Area | Status | Notes |
|------|--------|-------|
| Manifest | Good | `standalone`, portrait, theme/background colors, 192/512 icons |
| Service worker | Good | Network-only navigations (avoids stale HTML loop); cache-first static assets |
| Install prompt | Good | Chromium `beforeinstallprompt` + iOS Add-to-Home-Screen guide |
| Safe areas | Good | `viewportFit: cover`, `env(safe-area-inset-*)` on play/home |
| Scroll lock | Good | `play-scroll-lock` on `<html>` during active play |
| Reconnect | Good | Player ID in persistent + session storage; Partysocket auto-reconnects |
| Clipboard share | Good | Sync `execCommand` fallback before async clipboard (mobile Safari) |
| Audio | Needs unlock | Web Audio suspended until user gesture — **fixed** via `useAudioUnlock` |

## Hardening applied (this branch)

1. **Manifest** — Added `id`, `lang`, `prefer_related_applications: false`, shortcut to solo play.
2. **Service worker** — Bumped cache to `cambio-v3`; offline shell for `/` and `/play/*` (network-first with cached fallback); `message` handler for skip-waiting updates.
3. **PwaRegistrar** — Registers update listener; prompts reload when a new SW activates.
4. **Reconnect** — Documented: backgrounding preserves `localStorage` player ID; socket reconnects on foreground; fresh tab uses session storage until `room_info` persists ID.
5. **Platform adapters** — Storage/clipboard behind `@cambio/client/platform` for future Capacitor/Expo (CAM-34).

## Manual verification checklist

Run on **iOS Safari** and **Android Chrome** (real devices):

- [ ] Add to Home Screen → launches standalone without browser chrome
- [ ] Create room → join from second device → full game through Cambio call
- [ ] Solo game → snap, chat, settings drawer
- [ ] Background app 30s → foreground → still connected / reconnects without duplicate seat
- [ ] Copy room link → paste in Messages / Notes
- [ ] First tap enables sound (draw/peek/snap audible when sound on)
- [ ] Safe area: notch/home indicator don't clip Call Cambio or chat input

## Known gaps (defer)

- No offline gameplay (requires network for PartyServer)
- No push notifications for turn alerts
- Tutorial coach (CAM-66+) not stacked on this branch — merge separately

## Related issues

- CAM-33 (this audit)
- CAM-34 (platform adapters)
- CAM-38+ native shells — **not in scope**
