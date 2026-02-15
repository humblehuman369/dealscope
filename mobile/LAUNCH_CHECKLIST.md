# DealGapIQ Mobile — App Store Launch Checklist

## Pre-submission credentials (required before `eas submit`)

### iOS — App Store Connect
- [ ] Replace `APPLE_ID_PLACEHOLDER` in `eas.json` → your Apple ID email
- [ ] Replace `ASC_APP_ID_PLACEHOLDER` → App Store Connect app ID (numeric)
- [ ] Replace `APPLE_TEAM_ID_PLACEHOLDER` → Apple Developer Team ID (10-char)
- [ ] Run `eas credentials --platform ios` to configure signing certificates
- [ ] Store Apple credentials via `eas secret:create` (do **not** commit)

### Android — Google Play Console
- [ ] Create a Google Play service account key (`google-services-key.json`)
- [ ] Upload the key to EAS secrets: `eas secret:create --scope project --name GOOGLE_PLAY_SERVICE_ACCOUNT_KEY --type file --value ./google-services-key.json`
- [ ] Create the app listing in Google Play Console
- [ ] Complete the app content declarations (privacy, ads, target audience)
- [ ] Run `eas credentials --platform android` to configure keystore

---

## App Store metadata (both platforms)

### Required assets
- [ ] App icon (1024×1024 PNG, no transparency, no rounded corners)
- [ ] iPhone screenshots: 6.7" (1290×2796) — minimum 3, recommended 6
- [ ] iPhone screenshots: 5.5" (1242×2208) — required if supporting older devices
- [ ] iPad screenshots: 12.9" (2048×2732) — required if `supportsTablet: true`
- [ ] Android feature graphic (1024×500)
- [ ] Android phone screenshots (minimum 2, recommended 8)

### Copy
- [ ] App name: "DealGapIQ" (30 chars max iOS, 50 chars max Android)
- [ ] Subtitle (iOS, 30 chars): "Real Estate Investment Intelligence"
- [ ] Short description (Android, 80 chars): "Scan any property. Know in 60 seconds if it's worth your time."
- [ ] Full description (4000 chars max): Feature overview, key benefits, disclaimer
- [ ] Keywords (iOS, 100 chars): "real estate,investment,property,analysis,scanner,rental,flip,BRRRR"
- [ ] Category: Finance (primary), Business (secondary)
- [ ] Content rating: fill out the rating questionnaire (no violence, no gambling)

### Legal
- [ ] Privacy policy URL: `https://dealgapiq.com/privacy` (already configured)
- [ ] Terms of service URL: `https://dealgapiq.com/terms`
- [ ] Support URL: `https://dealgapiq.com/help` or `mailto:support@dealgapiq.com`
- [ ] Data safety form (Google Play): complete based on `app.config.js` privacy manifest
- [ ] App privacy labels (iOS): complete based on `privacyManifests` in config

---

## Build & submit commands

```bash
# Preview build (internal testing)
eas build --profile preview --platform all

# Production build
eas build --profile production --platform all

# Submit to stores
eas submit --platform ios --profile production
eas submit --platform android --profile production
```

---

## Post-launch

- [ ] Monitor Sentry for crash reports
- [ ] Set up OTA update channel: `eas update --channel production`
- [ ] Configure app review response templates
- [ ] Schedule first OTA update to verify the pipeline works
- [ ] Restrict Google Maps API key in Google Cloud Console:
  - iOS: bundle ID `com.dealgapiq.mobile`
  - Android: package `com.dealgapiq.mobile` + SHA-1 fingerprint
  - APIs: Maps SDK for iOS, Maps SDK for Android only
