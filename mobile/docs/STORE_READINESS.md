# App Store / Play Store Readiness Checklist

Use this checklist before submitting to the App Store or Google Play.

## Links and metadata

- [ ] **Privacy policy URL** — Must match the URL used in store listings. In-app: `/privacy` screen; store listing should point to your hosted policy (e.g. `https://dealgapiq.com/privacy`).
- [ ] **Terms of service URL** — In-app: `/terms` screen; store listing should point to your hosted terms (e.g. `https://dealgapiq.com/terms`).
- [ ] **Support URL** — In-app: Contact support (e.g. `mailto:support@dealgapiq.com`). Store listing often requires a support URL (e.g. `https://dealgapiq.com/help` or contact page).

## Compliance

- [ ] **Export compliance** — `app.config.js` sets `ITSAppUsesNonExemptEncryption: false` for iOS. Confirm this is correct for your use of HTTPS only.
- [ ] **Data collection** — iOS privacy manifest is configured in `app.config.js` (NSPrivacyCollectedDataTypes, etc.). Keep in sync with actual data practices.

## Version and build

- [ ] **Version strategy** — `app.config.js`: `version` is user-facing semver; `ios.buildNumber` and `android.versionCode` are auto-incremented by EAS for production/beta.
- [ ] **OTA updates** — `runtimeVersion` uses `appVersion` policy; test that OTA updates apply to the correct native binary version.

## Before submit

- [ ] **Production build** — Run `eas build --profile production --platform all` and install on real iOS and Android devices.
- [ ] **OTA channel** — After release, verify `eas update --channel production` targets the live app version.
- [ ] **Store listing** — Description, keywords, screenshots, and optional video are filled in App Store Connect and Play Console.

---

*Last updated: see BUILDING.md for full build and distribution steps.*
