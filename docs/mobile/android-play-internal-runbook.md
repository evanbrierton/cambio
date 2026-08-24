# Android Play Console internal testing runbook (CAM-40)

Upload Cambio Capacitor shell builds to Google Play **Internal testing** track.

**Shell mode:** remote URL — loads `https://cambio.brierton.ie`. Online Cloudflare PartyServer unchanged.

## Prerequisites (operator)

| Item | Notes |
| --- | --- |
| Google Play Console developer account | One-time $25 registration |
| App created in console | Package name **`ie.brierton.cambio`** (immutable after first upload) |
| Upload keystore | Create and back up securely — loss prevents updates |
| Play App Signing | Enroll app in Play App Signing (recommended) on first upload |

**Blocker if missing:** Without Play Console access and a signing keystore, an operator must create the app record and keystore offline. Secrets must not be committed to git.

### Create upload keystore (one-time)

```bash
keytool -genkey -v -keystore cambio-upload.jks -keyalg RSA -keysize 2048 -validity 10000 \
  -alias cambio-upload -storetype JKS
```

Store `cambio-upload.jks` and passwords in a team password manager. Add to `.gitignore` if kept locally.

## Project setup

1. From repo root:
   ```bash
   pnpm install
   pnpm --filter @cambio/native cap:add:android   # skip if android/ exists
   CAPACITOR_SERVER_URL=https://cambio.brierton.ie pnpm --filter @cambio/native cap:sync
   pnpm --filter @cambio/native assets:sync
   ```
2. Open Android Studio:
   ```bash
   pnpm --filter @cambio/native cap:open:android
   ```
3. Verify `android/app/build.gradle`:
   - `applicationId "ie.brierton.cambio"`
   - `versionCode` — increment every upload
   - `versionName` — e.g. `"0.1.0"`
4. Verify `android/app/src/main/res/values/strings.xml`:
   - `app_name` = **Cambio**

## Signing configuration

Create `android/keystore.properties` locally (gitignored — template below):

```properties
storeFile=../cambio-upload.jks
storePassword=<store-password>
keyAlias=cambio-upload
keyPassword=<key-password>
```

Wire into `android/app/build.gradle` (if not already present after `cap add`):

```gradle
def keystorePropertiesFile = rootProject.file("keystore.properties")
def keystoreProperties = new Properties()
if (keystorePropertiesFile.exists()) {
    keystoreProperties.load(new FileInputStream(keystorePropertiesFile))
}

android {
    signingConfigs {
        release {
            if (keystorePropertiesFile.exists()) {
                storeFile file(keystoreProperties['storeFile'])
                storePassword keystoreProperties['storePassword']
                keyAlias keystoreProperties['keyAlias']
                keyPassword keystoreProperties['keyPassword']
            }
        }
    }
    buildTypes {
        release {
            signingConfig signingConfigs.release
            minifyEnabled false
        }
    }
}
```

## Build release AAB

Google Play requires **Android App Bundle** (`.aab`), not APK, for new apps.

```bash
cd apps/native/android
./gradlew bundleRelease
```

Output: `android/app/build/outputs/bundle/release/app-release.aab`

For local sideload testing before Play upload:

```bash
./gradlew assembleRelease
# APK: android/app/build/outputs/apk/release/app-release.apk
adb install -r app/build/outputs/apk/release/app-release.apk
```

## Upload to Internal testing

1. Play Console → **Cambio** → **Testing** → **Internal testing**
2. **Create new release**
3. Upload `app-release.aab`
4. Release name: e.g. `0.1.0 (1)` — match `versionName` / `versionCode`
5. Release notes: “Capacitor shell; online multiplayer via cambio.brierton.ie”
6. **Review release** → **Start rollout to Internal testing**
7. Add testers: email list or Google Group under **Testers** tab

Testers open the opt-in link on device and install from Play Store.

## Store listing (can complete in parallel)

Before promoting beyond internal track, complete:

- [ ] App name, short description, full description ([store-metadata-template.md](./store-metadata-template.md))
- [ ] App icon 512×512
- [ ] Feature graphic 1024×500
- [ ] Phone screenshots (2+)
- [ ] Privacy policy URL
- [ ] Data safety form (no account; ephemeral room/player IDs; Cloudflare hosting)
- [ ] Content rating questionnaire → **Everyone**

Privacy policy draft: [privacy-policy-template.md](./privacy-policy-template.md)

## Post-upload verification

1. Install from internal testing link on physical Android device
2. Run [device-smoke-checklist.md](./device-smoke-checklist.md)
3. Record results on Linear CAM-40

## Troubleshooting

| Issue | Fix |
| --- | --- |
| Package name mismatch | Must be `ie.brierton.cambio` — cannot change after first upload |
| Upload key rejected | Ensure same keystore as first upload, or reset via Play support |
| Cleartext traffic blocked | Production uses HTTPS; do not ship `CAPACITOR_ALLOW_CLEARTEXT=true` builds to Play |
| WebView blank | Confirm production URL baked in at `cap:sync` |
| Version code conflict | Increment `versionCode` in `build.gradle` |

## Version bump checklist (each upload)

- [ ] Increment `versionCode` in `android/app/build.gradle`
- [ ] Update `versionName` if marketing version changes
- [ ] Re-run `cap:sync` when native config/plugins change
- [ ] Re-run smoke checklist on internal track build
