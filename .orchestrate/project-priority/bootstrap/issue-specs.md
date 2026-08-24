# Linear issue specs — remaining priority work

Source: [Project priority order](https://linear.app/ebrierton-cambio/document/project-priority-order-67a9122bb396)

## Priority 1: Finish Offline P2P Phase 1

Sequence: CAM-23 → (CAM-24 ∥ CAM-25)

### CAM-23 — Add useP2PConnection hook

**Status:** In Progress · **Estimate:** L

Create `src/hooks/useP2PConnection.ts` with same return type as `useGameConnection`:

- Uses `useServerMessages` for inbound handling
- **Host mode:** instantiate `GameHost`, wire `lan-transport` peer connections
- **Guest mode:** connect to host endpoint, send/receive JSON messages

Update `src/app/play/[roomId]/page.tsx`:

- Detect `mode=local` query param
- Use `useP2PConnection` when local; pass `host=1` / `join=1` and optional `endpoint`
- Player ID persistence via `storageKey` / `freshSessionKey`

**Acceptance:**

- Host creates local room, guest joins, both see lobby
- Full game playable over LAN transport
- Online `/play/{roomId}` flow unaffected (`mode` absent or `mode=online`)

### CAM-24 — Play nearby lobby flow

**Status:** Backlog · **Blocked by:** CAM-23 · **Estimate:** L

Add **Play nearby** section to `src/app/page.tsx`:

- **Host:** generate room code → `/play/{code}?mode=local&host=1&name=...`
- **Join:** enter room code + host endpoint → `/play/{code}?mode=local&join=1&endpoint=...&name=...`

Host lobby UI (GameTable or `LocalHostPanel.tsx`):

- Display room code, host IP + port
- Copy-to-clipboard (reuse online room code pattern)
- Warning: *"Keep this device awake while hosting"*
- Mobile: default to join; show host warning if user chooses to host

Guest error states: host unreachable, wrong endpoint, host left

**Acceptance:**

- New player can host nearby game from homepage
- Second player can join with room code + endpoint
- Online homepage layout and flows unchanged

### CAM-25 — Host reliability

**Status:** Backlog · **Blocked by:** CAM-23 · **Estimate:** M

Create `src/hooks/useHostReliability.ts`:

- Wake Lock: `navigator.wakeLock.request("screen")` while hosting
- Re-request on `visibilitychange` when tab visible
- Release when game ends or user leaves

Visibility pause in `GameHost`:

- Tab hidden → pause snap timers, set `paused: true` in broadcast state
- Tab visible → resume timers (extend `snapWindowEndsAt` by hidden duration)
- Guests see "Game paused — host returned to the app" banner

Host UI warnings on mobile; graceful guest disconnect UX

**Acceptance:**

- Host screen stays on during active local game (where Wake Lock supported)
- Host switching apps pauses game; resuming unpauses
- Guests see clear paused / disconnected states
- Wake Lock / pause only active in `mode=local` host role

## Priority 2: Capacitor store testing (parallel-friendly)

### CAM-40 — TestFlight and Play Console internal testing

**Status:** Backlog · **Estimate:** S

Prepare store listing assets and internal build pipeline:

- App icons, splash, display name, bundle IDs
- Privacy policy / store metadata drafts
- iOS signing + TestFlight upload checklist
- Android signing + Play internal track upload checklist
- Device matrix smoke checklist (create / join / solo / reconnect / background)

**Note:** Actual store uploads may require operator credentials. Document blockers in handoff if credentials unavailable.

**Acceptance:**

- Checklist and asset prep complete in repo
- Upload steps documented with any operator actions needed
- Known WebView limitations tracked for future Expo decision

## Out of scope (Later)

- Expo 2b (CAM-41–44)
- WebRTC / QR discovery (CAM-26–27)
- Host migration (CAM-29–31)
- Matchmaking P2 (CAM-58–62)
