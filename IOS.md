# Hey Neighbor — iOS / App Store submission

The project is already a Capacitor iOS app. The native project lives in `ios/`
and is committed, so a **cloud macOS machine** can build and upload it — your
Mac never needs Xcode.

The native shell loads the deployed site (`https://hey-neighbor-io.lovable.app`)
and adds real native capabilities on top: location for 1 km matching, camera and
photo library for item photos, and APNs push notifications. Permission strings
and portrait-only orientation are already set in `ios/App/App/Info.plist`.

---

## 1. Apple accounts (one time, ~15 min, no Mac needed)

1. Join the Apple Developer Program — https://developer.apple.com/programs ($99/yr).
2. In App Store Connect → Apps → **+** → New App:
   - Platform: iOS
   - Name: **Hey Neighbor**
   - Bundle ID: `app.lovable.heyneigh` (register it first at
     Certificates, Identifiers & Profiles → Identifiers → App IDs, and enable
     **Push Notifications**)
   - SKU: `hey-neighbor`
3. Note the app's **Apple ID** number (App Store Connect → App Information).
4. Create an **App Store Connect API key**: Users and Access → Integrations →
   App Store Connect API → generate a key with *App Manager* role. Save the
   `.p8` file, the **Key ID**, and the **Issuer ID**.

## 2. Pick a cloud build service

### Option A — Codemagic (easiest, does signing for you)

`codemagic.yaml` in the repo root is ready.

1. Push this project to GitHub (Lovable → GitHub → Connect).
2. Sign up at https://codemagic.io and add the repository.
3. Teams → Integrations → **Developer Portal**: upload the `.p8` API key, Key ID
   and Issuer ID, name the integration `HeyNeighborASC` (must match the yaml).
4. In `codemagic.yaml`, replace `APP_STORE_APPLE_ID: 0000000000` with your app's
   Apple ID number.
5. Start the `ios-appstore` workflow. Codemagic generates the certificate and
   provisioning profile automatically, builds the `.ipa`, and pushes it to
   TestFlight. Free tier includes 500 macOS build minutes/month.

### Option B — GitHub Actions (free minutes on public repos)

`.github/workflows/ios-testflight.yml` builds on a `macos-15` runner. Add these
repository secrets (Settings → Secrets and variables → Actions):

| Secret | Value |
| --- | --- |
| `IOS_TEAM_ID` | 10-char Apple Team ID |
| `IOS_CERT_P12_BASE64` | Distribution certificate `.p12`, base64 encoded |
| `IOS_CERT_PASSWORD` | Password for that `.p12` |
| `IOS_PROVISIONING_PROFILE_BASE64` | App Store profile, base64 encoded |
| `ASC_KEY_ID` / `ASC_ISSUER_ID` / `ASC_PRIVATE_KEY` | App Store Connect API key |

Then run the workflow manually, or push a tag like `ios-v1.0.0`.

Certificates and profiles are created in the Apple Developer web portal
(Certificates, Identifiers & Profiles) — no Mac required. Codemagic (Option A)
skips this step entirely, which is why it's recommended.

## 3. Push notifications

The identifier must have the Push Notifications capability, and you need an
**APNs Auth Key** (Keys → **+** → Apple Push Notification service). Store the
`.p8`, Key ID and Team ID with your push provider so requests-for-an-item alerts
reach the native app. In the browser, web notifications already work.

## 4. App Store listing assets

- **Screenshots**: 6.7" (1290×2796) and 6.5" required. Use the framed images
  already generated for this project, or capture more from the preview.
- **Privacy policy URL**: https://hey-neighbor-io.lovable.app/privacy
- **Terms URL**: https://hey-neighbor-io.lovable.app/terms
- **App privacy** questionnaire: declare Location (app functionality),
  Photos, Email/Name (account), and Contact/User content (chat).
- **Category**: Lifestyle (secondary: Food & Drink).
- **Age rating**: 12+ is typical for user-generated content apps; the app has
  profanity/explicit-content filtering and user blocking, which Apple requires
  for UGC — mention both in the review notes.
- **In-app purchases**: the €1 extra-claim fee is a real-world goods/services
  transaction (people receive physical items), so Stripe is allowed. Explain
  this in App Review notes so it isn't flagged as bypassing IAP.
- **Demo account**: provide a test login in App Review Information.

## 5. Reviewer notes template

> Hey Neighbor connects neighbors within 1 km to pass on unopened packaged food,
> clothing, furniture and other items for free. Receivers get 5 free claims per
> calendar month; a €1 fee applies to additional claims, which covers a
> real-world physical item exchange (not digital content), processed via Stripe.
> Both parties must agree before a claim completes. User-generated content is
> filtered for profanity and explicit imagery, and every user can block another
> user from item pages, chat, or their profile.

## 6. Updating the app later

Web/UI changes go live instantly on the deployed site and appear in the app with
no resubmission. Resubmit only when native code, plugins, permissions or the app
version change:

```bash
npm run build && npx cap sync ios   # then re-run the cloud workflow
```
