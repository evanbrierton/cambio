# Store asset checklist (CAM-40)

Pre-flight checklist before uploading Cambio to TestFlight and Google Play internal testing.

## Identity (verified in repo)

| Field | Value | Source |
| --- | --- | --- |
| App name | Cambio | `capacitor.config.ts` → `appName` |
| iOS bundle ID | `ie.brierton.cambio` | `capacitor.config.ts` → `appId` |
| Android application ID | `ie.brierton.cambio` | `capacitor.config.ts` → `appId` |
| Marketing version | `0.1.0` | `apps/native/package.json` |
| Production WebView URL | `https://cambio.brierton.ie` | `capacitor.config.ts` default |
| Privacy policy URL (draft) | `https://cambio.brierton.ie/privacy` | `store.config.json` — publish page before store submission |
| Support email | `support@brierton.ie` | `store.config.json` |

After `cap:add:ios` / `cap:add:android`, confirm native projects match:

- **iOS:** Xcode → App target → General → Display Name = **Cambio**, Bundle Identifier = **ie.brierton.cambio**
- **Android:** `android/app/src/main/res/values/strings.xml` → `app_name` = **Cambio**, `android/app/build.gradle` → `applicationId "ie.brierton.cambio"`

## Icon and splash assets

Source files live in `apps/native/resources/` (generated from production brand icon):

| Asset | Size | Path |
| --- | --- | --- |
| App icon source | 1024×1024 PNG | `apps/native/resources/icon.png` |
| Splash source | 2732×2732 PNG | `apps/native/resources/splash.png` |
| Splash (dark) | 2732×2732 PNG | `apps/native/resources/splash-dark.png` |

Regenerate from production icon:

```bash
pnpm --filter @cambio/native assets:generate
```

Apply to native projects (requires existing `ios/` and `android/` from `cap:add:*`):

```bash
pnpm --filter @cambio/native assets:sync
```

### Platform outputs to verify after `assets:sync`

**iOS**

- [ ] `ios/App/App/Assets.xcassets/AppIcon.appiconset/` contains all required sizes
- [ ] `ios/App/App/Assets.xcassets/Splash.imageset/` or storyboard splash updated
- [ ] Home screen icon shows Cambio “C” card motif on `#12061f` background

**Android**

- [ ] `android/app/src/main/res/mipmap-*/ic_launcher*.png` updated
- [ ] Adaptive icon foreground/background in `mipmap-anydpi-v26/`
- [ ] Splash drawable in `drawable*/splash.png` (Capacitor default layout)

## Store listing graphics (operator-provided)

These are **not** committed as binaries; prepare before App Store Connect / Play Console submission.

| Asset | Apple App Store | Google Play |
| --- | --- | --- |
| App icon | 1024×1024 (no alpha) — use `resources/icon.png`, flatten alpha if required | 512×512 — export from `resources/icon.png` |
| Feature graphic | N/A | 1024×500 JPG/PNG |
| Phone screenshots | 6.7" and 5.5" minimum (1290×2796, 1242×2208) | 2+ phone screenshots (min 320px short edge) |
| Tablet screenshots | Optional | Optional for v1 |
| Promo video | Optional | Optional |

Screenshot scenes to capture on device:

1. Home / create room
2. Lobby with players
3. Active game table (cards visible post-snap or tutorial)
4. Solo game

Use templates in [store-metadata-template.md](./store-metadata-template.md).

## Legal and policy

- [ ] Privacy policy published at public URL (draft: [privacy-policy-template.md](./privacy-policy-template.md))
- [ ] Apple App Privacy questionnaire completed (no tracking; multiplayer uses Cloudflare Workers)
- [ ] Google Play Data safety form completed (account not required; room codes + display names only)
- [ ] Content rating: **4+** / **Everyone** (card game, no gambling real money)

## Signing credentials (operator — not in repo)

| Platform | Required | Status |
| --- | --- | --- |
| Apple Developer Program | Team membership + App ID `ie.brierton.cambio` | **Operator action** — enroll at [developer.apple.com](https://developer.apple.com) |
| iOS distribution cert + profile | App Store distribution | **Operator action** — Xcode automatic signing or manual certs |
| App Store Connect app record | Bundle ID linked | **Operator action** |
| Google Play Console | Developer account | **Operator action** — [play.google.com/console](https://play.google.com/console) |
| Android upload keystore | `.jks` or Play App Signing | **Operator action** — create once, store securely offline |

See runbooks:

- [iOS TestFlight upload](./ios-testflight-runbook.md)
- [Android Play internal track](./android-play-internal-runbook.md)

## Pre-upload smoke gate

Do not upload until [device-smoke-checklist.md](./device-smoke-checklist.md) passes on at least one iOS and one Android device against the **production** WebView URL (`https://cambio.brierton.ie`).

## Related

- `apps/native/README.md` — shell setup and asset scripts
- `apps/native/store.config.json` — machine-readable store constants
- [webview-limitations.md](./webview-limitations.md) — Capacitor vs future Expo path
