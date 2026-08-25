# WebView limitations (Capacitor) — Expo decision notes (CAM-40)

Cambio Phase 2a ships a **Capacitor WebView shell** loading the production Next.js UI (`server.url`). This document captures known limitations for store testing and informs the Phase 2b **Expo** decision (CAM-32 epic).

## Current architecture

```
Capacitor shell (iOS / Android)
└── WKWebView / Android WebView
    └── Remote URL: https://cambio.brierton.ie
        └── Same React DOM + Tailwind + Framer Motion as web
            └── WebSocket → Cloudflare PartyServer (unchanged)
```

**What works well in WebView**

- ~95% UI parity with web without rewriting components
- Fast path to TestFlight / Play internal testing
- Capacitor plugins (Share, Clipboard, Haptics, StatusBar) bridge native APIs
- Online multiplayer unchanged — `wss://` to Workers allowed via `allowNavigation`

## Known WebView limitations

| Area | WebView behavior | Impact on Cambio | Expo / RN path |
| --- | --- | --- | --- |
| **Background WebSockets** | iOS suspends JS in background; Android may kill network | Reconnect on foreground must work ([device-smoke-checklist](./device-smoke-checklist.md) R1–R3) | Same server; RN socket lifecycle differs but still needs reconnect UX |
| **SSR / theme cookies** | No Next.js SSR in shell; theme cookies not set on first paint | FOUC or default theme until client hydration; native should use storage adapter (CAM-34) | Client-only theme state; NativeWind tokens |
| **Framer Motion** | Runs in WebView; jank possible on low-end Android | Acceptable for v1; watch scroll + layout animations on device matrix | Reanimated preferred for 60fps gestures |
| **Scroll / overscroll** | Outer WebView bounce disabled by Capacitor; inner CSS scrollports required | Documented in `apps/native/README.md`; regressions if web CSS changes | Native scroll views per screen |
| **Safe areas** | CSS `env(safe-area-inset-*)` + `viewport-fit=cover` | Works when `native-shell` class applied | `react-native-safe-area-context` |
| **Audio** | Web Audio requires user gesture unlock | Same as mobile Safari; `useAudioUnlock` | `expo-av` or native audio |
| **Push notifications** | Not available in WebView v1 | No turn alerts (CAM-93 deferred) | Expo notifications |
| **Deep links** | Requires universal links / intent filters in native project | Manual join via code OK for v1; `cambio://` in CAM-91 | Expo linking |
| **Offline / bundled mode** | Remote URL requires network for UI | No offline shell if CDN down; bundled export is future option | Expo bundle + optional offline P2P |
| **App Store review** | WebView apps acceptable if app provides substantial native value | Plugins + standalone experience; avoid “thin wrapper” rejection | Full native UI stronger review story |
| **Performance** | Heavier than RN for complex animations | Monitor on budget Android in smoke tests | Better animation GPU path |
| **Keyboard** | Virtual keyboard resizes WebView inconsistently | Test chat input on iOS + Android | `KeyboardAvoidingView` |
| **File / storage** | `localStorage` in WebView; cleared if WebView data cleared | Player ID persistence same as PWA | SecureStore for IDs |
| **Biometrics / Keychain** | Needs Capacitor plugin | Not required v1 | expo-secure-store |
| **OTA UI updates** | Remote URL → deploy web = instant UI update for shell users | **Advantage of remote URL mode** | Requires app update or Expo Updates |
| **Debugging** | Safari Web Inspector / Chrome remote debug | Adequate for v1 | Flipper / RN devtools |

## Remote URL vs bundled assets

| Mode | Pros | Cons |
| --- | --- | --- |
| **Remote URL (current)** | UI updates without store review; single deployment | Requires network at launch; store review may ask about offline behavior |
| **Bundled `webDir` (future)** | Works offline for shell; faster cold start | Must ship store update for UI fixes; Next.js static export constraints |

CAM-40 internal testing uses **remote URL + production** intentionally so testers always hit current web deploy. Document this in TestFlight / Play release notes.

## Criteria to trigger Expo investment (Phase 2b)

Consider accelerating CAM-86+ when smoke testing shows:

1. Unacceptable animation jank on target Android devices
2. Frequent WebView crashes or memory kills during play
3. Reconnect failures disproportionate vs mobile Safari PWA
4. App Store / Play rejection citing minimal native functionality
5. Product need for push, deep links, or offline P2P that WebView cannot satisfy

## What stays shared regardless

Per CAM-32 strategy, these remain platform-agnostic:

- `packages/game` — rules engine
- `packages/client` — connection protocol, storage/clipboard adapters
- `party/` — Cloudflare PartyServer (online mode unchanged)

## References

- Epic: CAM-32 (iOS + Android port)
- Capacitor shell: CAM-38 (done), plugins CAM-39 (done)
- Store prep: CAM-40 (this phase)
- Platform adapters: [platform-adapters.md](./platform-adapters.md)
- Native README: `apps/native/README.md`
