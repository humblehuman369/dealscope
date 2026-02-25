# DealGapIQ Mobile App - Build & Distribution Guide

## Prerequisites

1. **Expo CLI & EAS CLI**
   ```bash
   npm install -g expo-cli eas-cli
   ```

2. **EAS Account**
   - Create account at https://expo.dev
   - Login: `eas login`

3. **Apple Developer Account** (for iOS)
   - Required for TestFlight and App Store
   - Update `eas.json` with your Apple credentials

4. **Google Play Console** (for Android)
   - Required for internal testing and Play Store
   - Create a service account key

---

## EAS Project Configuration

For maintainers: the Expo/EAS project identifiers are defined in `app.config.js`:

| Field | Value | Purpose |
|-------|-------|---------|
| **slug** | `dealgapiq` | Expo project slug; must match the project on expo.dev |
| **projectId** | (set by EAS) | Removed from config — was linked to old "investiq" project. EAS adds the correct projectId when you run `eas build` and link to the "dealgapiq" project. |
| **owner** | `humblehuman369` | Expo account/organization |

**Important:** The slug must match the project at https://expo.dev/accounts/humblehuman369/projects/. If you see "Slug for project identified by extra.eas.projectId does not match", the projectId in config points to the wrong project — remove it and run `eas build` to re-link to the correct project.

---

## Development Builds

### Local Development
```bash
# Start development server
npx expo start

# Run on iOS simulator
npx expo run:ios

# Run on Android emulator
npx expo run:android
```

### Development Client Build
For testing native modules on a physical device:
```bash
# Build development client
eas build --profile development --platform ios
eas build --profile development --platform android
```

---

## Beta Testing

### Preview Build (Internal Testing)
```bash
# Build preview APK/IPA
eas build --profile preview --platform all

# Or specific platform
eas build --profile preview --platform ios
eas build --profile preview --platform android
```

### Beta Build (TestFlight/Internal Testing)
```bash
# Build and auto-increment version
eas build --profile beta --platform all
```

### Distribute to Testers
1. **iOS**: Upload to TestFlight via `eas submit --profile beta --platform ios`
2. **Android**: Share APK directly or via Google Play Internal Testing

---

## Production Release

### 1. Prepare for Release

- [ ] Update version in `app.json`
- [ ] Review and update `privacy.tsx` and `terms.tsx`
- [ ] Generate production app icons
- [ ] Create app store screenshots
- [ ] Write app description and release notes

### 2. Build Production
```bash
eas build --profile production --platform all
```

### 3. Submit to Stores
```bash
# iOS App Store
eas submit --profile production --platform ios

# Google Play Store
eas submit --profile production --platform android
```

---

## App Store Assets

### Required Icons

| Platform | Size | Purpose |
|----------|------|---------|
| iOS | 1024x1024 | App Store |
| iOS | 180x180 | Home screen (3x) |
| iOS | 120x120 | Home screen (2x) |
| Android | 512x512 | Play Store |
| Android | 192x192 | Adaptive icon |
| Android | 48x48 | Legacy icon |

### Screenshots Required

**iOS** (6.5" Display - iPhone 14 Pro Max):
- 1290 x 2796 pixels
- Minimum 3, maximum 10 screenshots

**iOS** (5.5" Display - iPhone 8 Plus):
- 1242 x 2208 pixels
- Minimum 3, maximum 10 screenshots

**Android**:
- Minimum: 320 x 320 pixels
- Maximum: 3840 x 3840 pixels
- Recommended: 1080 x 1920 pixels

### Recommended Screenshots
1. Scan screen with property pointed at
2. Property analysis results
3. Strategy comparison chart
4. Map with cached properties
5. Portfolio overview
6. History with favorites

---

## Environment Variables

### Required for Production

```env
# Backend API
EXPO_PUBLIC_API_URL=https://dealscope-production.up.railway.app

# Google Maps (in app.json)
GOOGLE_MAPS_API_KEY=your_key_here
```

### EAS Secrets (for builds)

Before production builds, ensure these secrets are configured:

```bash
# Google Maps (required for maps to work)
eas secret:create --name EXPO_PUBLIC_GOOGLE_MAPS_API_KEY --value your_key --scope project

# Sentry source maps (optional)
eas secret:create --name SENTRY_AUTH_TOKEN --value your_token --scope project

# Android: Upload Play service account key as file secret
eas secret:create --scope project --name GOOGLE_PLAY_SERVICE_ACCOUNT_KEY --type file --value ./google-services-key.json
```

**Verification checklist:**
- [ ] `EXPO_PUBLIC_GOOGLE_MAPS_API_KEY` set for production
- [ ] `SENTRY_AUTH_TOKEN` set if using Sentry
- [ ] `google-services-key.json` exists and is configured for Android
- [ ] Apple credentials (appleId, ascAppId, appleTeamId) valid in eas.json

---

## Version Management

### Semantic Versioning
- **Major**: Breaking changes, major features
- **Minor**: New features, enhancements  
- **Patch**: Bug fixes, small improvements

### Build Numbers
- **iOS**: Auto-incremented by EAS for production
- **Android**: `versionCode` auto-incremented

---

## Troubleshooting

### Build Fails
```bash
# Clear cache and rebuild
eas build --profile production --clear-cache
```

### Credentials Issues
```bash
# Reset credentials
eas credentials
```

### Expo Doctor
```bash
npx expo-doctor
```

---

## Checklist for App Store Submission

### iOS (App Store Connect)
- [ ] App icon (1024x1024)
- [ ] 6.5" screenshots (minimum 3)
- [ ] 5.5" screenshots (minimum 3)
- [ ] App name (30 characters max)
- [ ] Subtitle (30 characters max)
- [ ] Promotional text (170 characters)
- [ ] Description (4000 characters max)
- [ ] Keywords (100 characters)
- [ ] Support URL
- [ ] Privacy Policy URL
- [ ] Age rating questionnaire
- [ ] Contact information

### Android (Google Play Console)
- [ ] App icon (512x512)
- [ ] Feature graphic (1024x500)
- [ ] Screenshots (minimum 2)
- [ ] Short description (80 characters)
- [ ] Full description (4000 characters)
- [ ] Privacy Policy URL
- [ ] App category
- [ ] Content rating questionnaire
- [ ] Target audience
- [ ] Contact email

