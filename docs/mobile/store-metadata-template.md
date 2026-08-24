# Store metadata template (CAM-40)

Copy fields into App Store Connect and Google Play Console. Adjust tone before public release.

## App identity

| Field | Value |
| --- | --- |
| App name | Cambio |
| Subtitle (Apple, 30 chars) | Multiplayer card game |
| Short description (Google, 80 chars) | Play Cambio online with friends. Lowest score wins. |
| Bundle / package ID | `ie.brierton.cambio` |
| Category (Apple) | Games |
| Category (Google) | Game → Card |
| Content rating | Apple 4+ / Google Everyone |

## URLs

| Field | Value |
| --- | --- |
| Marketing URL | https://cambio.brierton.ie |
| Privacy policy URL | https://cambio.brierton.ie/privacy |
| Support URL | https://cambio.brierton.ie |
| Support email | support@brierton.ie |

## Description (long)

**Apple / Google (4000 char max — edit as needed):**

```
Cambio is a fast multiplayer card game for friends and family. Create a room, share the code, and play together online — or practice solo against bots.

FEATURES
• Create or join rooms with a simple code
• Real-time multiplayer powered by low-latency servers
• Solo mode to learn the rules
• Multiple visual themes
• Snap, swap, and call Cambio — lowest score wins

HOW TO PLAY
Each player has four hidden cards. Draw, discard, and use card abilities to improve your hand. Call Cambio when you think you have the lowest total — but watch for wrong snaps!

REQUIREMENTS
• Internet connection required for online play
• Designed for phones in portrait orientation

Questions? Contact support@brierton.ie
```

## Keywords (Apple, 100 chars)

```
card,game,multiplayer,cambio,friends,family,online,party,cards,snap
```

## Promotional text (Apple, 170 chars — optional)

```
Play Cambio with friends anywhere. Create a room, share the code, and start a game in seconds. Solo mode included.
```

## What’s New (release notes template)

```
Initial TestFlight / internal test build.

• Native iOS/Android shell for Cambio
• Online create, join, and solo play
• Share room links and haptic feedback on key actions

Requires network connection. Report issues to support@brierton.ie
```

## Screenshot captions (optional overlay text)

1. **Home** — “Create or join a game in seconds”
2. **Lobby** — “Share your room code with friends”
3. **Table** — “Real-time multiplayer card action”
4. **Solo** — “Practice against bots anytime”

## Review notes (for Apple / Google reviewers)

```
Cambio is an online multiplayer card game. No login required.

Test account: not required — tap "Play solo" on the home screen for immediate gameplay, or create a room and join from a second device with the displayed room code.

The app loads our web application in a native shell (Capacitor) pointed at https://cambio.brierton.ie. Multiplayer uses secure WebSockets to Cloudflare Workers.

No real-money gambling. No in-app purchases in this build.
```

## Localization (v1)

- Primary language: **English (U.S.)**
- Additional locales: defer until post-launch

## In-app purchases / ads

| Item | v1 status |
| --- | --- |
| In-app purchases | None |
| Ads | None |
| Subscription | None |

## Related files

- Icon source: `apps/native/resources/icon.png`
- Privacy draft: [privacy-policy-template.md](./privacy-policy-template.md)
- Asset checklist: [store-asset-checklist.md](./store-asset-checklist.md)
