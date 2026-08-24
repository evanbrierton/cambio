# Device matrix smoke checklist (CAM-40)

Run on **physical devices** after installing from TestFlight (iOS) or Play internal testing (Android). Use production WebView target: `https://cambio.brierton.ie`.

Record results in Linear CAM-40 (comment or attachment). One row per device × build.

## Build under test

| Field | Value |
| --- | --- |
| Platform | iOS / Android |
| Build source | TestFlight build # ___ / Play internal versionCode ___ |
| Shell sync URL | `https://cambio.brierton.ie` |
| Date | |
| Tester | |

## Device matrix (fill as tested)

| Device | OS version | Screen | Build | Result |
| --- | --- | --- | --- | --- |
| e.g. iPhone 15 | iOS 18.x | 6.1" | TF #1 | ☐ pass ☐ fail |
| e.g. Pixel 8 | Android 15 | 6.2" | VC 1 | ☐ pass ☐ fail |
| e.g. iPad Air | iPadOS 18.x | tablet | TF #1 | ☐ optional |
| e.g. budget Android | Android 13 | 6.5" | VC 1 | ☐ recommended |

Minimum for CAM-40 acceptance: **one iOS phone + one Android phone** on current internal builds.

## Core flows

Mark **PASS** / **FAIL** / **SKIP** and note defects.

### Launch and shell

| # | Step | Expected | iOS | Android | Notes |
| --- | --- | --- | --- | --- | --- |
| L1 | Cold launch app | Cambio loads home; no browser chrome; status bar readable on `#12061f` | | | |
| L2 | Safe areas | Home/play controls clear of notch, Dynamic Island, home indicator | | | |
| L3 | Status bar plugin | Light icons on dark background; no overlap with fixed header | | | |

### Create room

| # | Step | Expected | iOS | Android | Notes |
| --- | --- | --- | --- | --- | --- |
| C1 | Enter name → Create room | Lobby opens; room code visible | | | |
| C2 | Copy / share room link | Native share sheet or clipboard works | | | |
| C3 | Second device joins | Both see lobby; host can start | | | |

### Join room

| # | Step | Expected | iOS | Android | Notes |
| --- | --- | --- | --- | --- | --- |
| J1 | Join via code | Enters correct lobby | | | |
| J2 | Join via pasted link | Deep link opens app (universal links optional v1) or manual paste works | | | |

### Solo game

| # | Step | Expected | iOS | Android | Notes |
| --- | --- | --- | --- | --- | --- |
| S1 | Start solo from home | Game table loads with bots | | | |
| S2 | Draw, discard, snap | Actions work; haptics on snap (if enabled) | | | |
| S3 | Finish game | Game over / return to lobby or home | | | |

### Full multiplayer game

| # | Step | Expected | iOS | Android | Notes |
| --- | --- | --- | --- | --- | --- |
| M1 | 2+ humans through Cambio call | Round completes; scores update | | | |
| M2 | Chat | Messages send/receive | | | |
| M3 | Settings / theme | Theme change persists in session | | | |

### Reconnect

| # | Step | Expected | iOS | Android | Notes |
| --- | --- | --- | --- | --- | --- |
| R1 | Background app 30s → foreground | Still in room or reconnects without duplicate seat | | | |
| R2 | Toggle airplane mode 5s → off | Reconnects; game state recovers or shows clear error | | | |
| R3 | Force-quit → reopen app | Fresh launch to home; rejoin room via code still works | | | |

### Background / lifecycle

| # | Step | Expected | iOS | Android | Notes |
| --- | --- | --- | --- | --- | --- |
| B1 | Incoming phone call / notification shade | App pauses gracefully; no crash on return | | | |
| B2 | Low memory (switch apps rapidly) | WebView restores or reconnects | | | |
| B3 | Lock screen 1 min during play | Unlock → connection restored or rejoin path clear | | | |

### Audio and input

| # | Step | Expected | iOS | Android | Notes |
| --- | --- | --- | --- | --- | --- |
| A1 | First tap enables sound | Draw/peek/snap audible when sound on | | | |
| A2 | Keyboard / chat input | No viewport jump; input not clipped | | | |

## Regression guard (web unchanged)

Confirm separately on desktop/mobile **browser** (not shell):

- [ ] `https://cambio.brierton.ie` create/join/solo still works
- [ ] PartyServer / Cloudflare online mode unchanged

## Sign-off

| Criterion | Met? |
| --- | --- |
| All core flows PASS on ≥1 iOS + ≥1 Android | ☐ |
| No P0 defects open | ☐ |
| Results attached to CAM-40 | ☐ |

**P0 examples:** cannot join room, crash on launch, WebSocket never connects on cellular, duplicate player on reconnect.

## Related

- [store-asset-checklist.md](./store-asset-checklist.md)
- [webview-limitations.md](./webview-limitations.md)
- PWA audit checklist: [pwa-audit.md](./pwa-audit.md)
