# Cambio native shell (Capacitor)

This workspace package provides an iOS/Android shell around the existing Next.js web app. The shell runs in **remote URL mode** so native builds ship the current web deployment without rewriting React DOM UI components.

## Remote URL configuration

The native `appId` is `ie.brierton.cambio` (reverse-DNS of `cambio.brierton.ie`).

`apps/native/capacitor.config.ts` resolves the WebView URL with this precedence:

1. `CAPACITOR_SERVER_URL` (recommended for explicit production/staging/LAN selection)
2. `NEXT_PUBLIC_APP_URL` (same first preference used by `src/lib/site.ts`)
3. `https://cambio.brierton.ie` (production frontend)

Examples:

```bash
# Explicit production shell target (also the default)
CAPACITOR_SERVER_URL=https://cambio.brierton.ie pnpm --filter @cambio/native cap:sync

# Staging / preview shell target
CAPACITOR_SERVER_URL=https://staging.cambio.brierton.ie pnpm --filter @cambio/native cap:sync
```

For LAN/dev HTTP targets, enable cleartext traffic explicitly:

```bash
CAPACITOR_SERVER_URL=http://192.168.1.42:3000 \
CAPACITOR_ALLOW_CLEARTEXT=true \
pnpm --filter @cambio/native cap:sync
```

## Platform generation and local run

Run from the repository root.

1. Install workspace dependencies:
   ```bash
   pnpm install
   ```
2. Generate native projects (first run or after deleting `ios/`/`android/`):
   ```bash
   pnpm --filter @cambio/native cap:add:ios
   pnpm --filter @cambio/native cap:add:android
   ```
3. Sync Capacitor config and plugins:
   ```bash
   pnpm --filter @cambio/native cap:sync
   ```
4. Open in native IDEs:
   ```bash
   pnpm --filter @cambio/native cap:open:ios
   pnpm --filter @cambio/native cap:open:android
   ```

### iOS (Xcode)

- Select an iOS simulator/device.
- Build and run from Xcode.
- `StatusBar.overlaysWebView=true` draws the WebView under the status bar and home indicator; CSS `env(safe-area-inset-*)` keeps controls out of the notch/chin.
- After adding Share / Clipboard / Haptics, run `cap:sync` and rebuild the Xcode app so those plugins exist in the iOS binary.
- `cap:sync` now prints `cap ls`. Confirm `Haptics`, `Share`, and `Clipboard` are listed. If they are not, delete `apps/native/ios` and run `cap:add:ios` then `cap:sync` again.
- You can also open `apps/native/ios/App/CapApp-SPM/Package.swift` and check it contains `CapacitorHaptics` and `CapacitorShare`.
- Haptic patterns live in the web app (`triggerHaptic` / `hapticClick`). After the Haptics plugin is in the binary, extra taps and game events pick up on the next production deploy — no rebuild required. Muting sounds does not mute haptics.

### Android (Android Studio)

- Select an emulator/device.
- Build and run from Android Studio.
- Launch splash and status bar behavior comes from `SplashScreen` and `StatusBar` plugin config in `capacitor.config.ts`.

## Networking notes for PartyServer WebSocket access

The shell allows navigation to:

- the host from `CAPACITOR_SERVER_URL` / resolved default URL
- `cambio.brierton.ie` (production frontend)
- `cambio.brierton.workers.dev` (default PartyServer host)
- `*.workers.dev`
- `*.partykit.dev`
- localhost loopback hosts for development

This keeps production `wss://` access working while still permitting LAN/dev workflows when cleartext is enabled intentionally.

## Scroll / overscroll contract

Capacitor’s iOS bridge sets `webView.scrollView.bounces = false` by default (`CAPBridgeViewController`). Do **not** re-enable outer WebView bounce — it would rubber-band fixed chrome with the whole page.

Native-feel bounce comes from **nested** CSS scrollports in the web UI:

- Document / body: `overscroll-behavior: none` (also under `html.native-shell`)
- Lobby / sheets / chat / player rails / grids: `overscroll-behavior: contain` + `-webkit-overflow-scrolling: touch`

After regenerating `ios/` / `android/`, confirm the Capacitor WebView still has outer bounce disabled (Capacitor core default). Prefer fixing web scroll owners over custom bounce plugins.

## Remote URL mode vs future bundled export

- **Current (this phase):** remote URL mode (`server.url`) loads the deployed Next.js UI.
- **Future option:** switch to bundled web assets by building/exporting into `webDir` and removing `server.url` for an offline-capable shell flow.
