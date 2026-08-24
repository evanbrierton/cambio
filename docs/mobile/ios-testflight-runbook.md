# iOS TestFlight upload runbook (CAM-40)

Upload Cambio Capacitor shell builds to TestFlight for internal and external tester validation.

**Shell mode:** remote URL — the binary loads `https://cambio.brierton.ie` (or `CAPACITOR_SERVER_URL` at sync time). Online Cloudflare PartyServer mode is unchanged.

## Prerequisites (operator)

| Item | Notes |
| --- | --- |
| macOS with Xcode 15+ | Required for archive and upload |
| Apple Developer Program | Active membership on team that owns `ie.brierton.cambio` |
| App Store Connect access | Admin or App Manager role |
| App ID registered | Bundle ID `ie.brierton.cambio` in [Certificates, Identifiers & Profiles](https://developer.apple.com/account/resources/identifiers/list) |
| App Store Connect app | New app → iOS → Bundle ID `ie.brierton.cambio`, name **Cambio** |

**Blocker if missing:** Without Apple Developer credentials, complete enrollment and App ID registration before proceeding. This repo cannot store signing secrets.

## One-time Xcode setup

1. From repo root:
   ```bash
   pnpm install
   pnpm --filter @cambio/native cap:add:ios   # skip if ios/ exists
   CAPACITOR_SERVER_URL=https://cambio.brierton.ie pnpm --filter @cambio/native cap:sync
   pnpm --filter @cambio/native assets:sync
   ```
2. Open project:
   ```bash
   pnpm --filter @cambio/native cap:open:ios
   ```
3. Select **App** target → **Signing & Capabilities**:
   - Team: your Apple Developer team
   - Bundle Identifier: `ie.brierton.cambio`
   - Enable **Automatically manage signing** (recommended) or attach Distribution certificate + App Store provisioning profile manually
4. Confirm **General** tab:
   - Display Name: **Cambio**
   - Version: `0.1.0` (marketing)
   - Build: increment for each upload (e.g. `1`, `2`, …)

## Build archive

1. Scheme: **App** → destination **Any iOS Device (arm64)** (not simulator)
2. Product → **Archive**
3. When Organizer opens, select the archive → **Distribute App**
4. Choose **App Store Connect** → **Upload**
5. Options (typical for v1):
   - Include bitcode: off (deprecated)
   - Upload symbols: on (crash symbolication)
   - Manage Version and Build Number: Xcode can auto-increment build

Alternatively use CLI after archive:

```bash
xcrun altool --upload-app -f Cambio.ipa -t ios --apiKey KEY --apiIssuer ISSUER
```

Prefer **App Store Connect API key** (Users and Access → Keys) over app-specific passwords for CI later.

## TestFlight configuration

1. App Store Connect → **My Apps** → **Cambio** → **TestFlight**
2. Wait for build processing (5–30 minutes)
3. **Missing Compliance:** for encryption, Cambio uses HTTPS only → answer **No** for custom encryption (uses exempt standard TLS)
4. **Internal testing:**
   - Add internal testers (App Store Connect users on your team)
   - Builds available immediately after processing
5. **External testing (optional):**
   - Create group → add build → submit **Beta App Review** (first external build)
   - Provide test notes: “Multiplayer card game; requires network; create or join room via code”

## Store metadata (before public release)

Use [store-metadata-template.md](./store-metadata-template.md). Minimum for TestFlight external beta:

- Description, keywords, support URL, privacy policy URL
- 1024×1024 icon (from `apps/native/resources/icon.png`)
- Screenshots per device class

Privacy policy draft: [privacy-policy-template.md](./privacy-policy-template.md)

## Post-upload verification

1. Install via TestFlight on physical iPhone/iPad
2. Run [device-smoke-checklist.md](./device-smoke-checklist.md)
3. Attach checklist results to Linear CAM-40 or parent CAM-32

## Troubleshooting

| Issue | Fix |
| --- | --- |
| Signing failed | Verify team, bundle ID, and provisioning profile match `ie.brierton.cambio` |
| ITMS-90704 / invalid icon | Re-run `assets:sync`; ensure 1024 icon has no transparent corners if Apple rejects alpha |
| WebView blank on device | Confirm `CAPACITOR_SERVER_URL` was production at `cap:sync`; check ATS allows HTTPS to `cambio.brierton.ie` and `*.workers.dev` |
| Plugins missing | Run `cap:sync`, confirm `cap ls` lists Haptics, Share, Clipboard, StatusBar |
| Build not appearing | Check email for Apple processing errors; verify export compliance |

## Version bump checklist (each upload)

- [ ] Increment iOS build number in Xcode
- [ ] Optionally bump `apps/native/package.json` version for traceability
- [ ] Re-run `cap:sync` if `capacitor.config.ts` or plugin set changed
- [ ] Re-run smoke checklist on TestFlight build
