/**
 * Expo app configuration — production-ready
 *
 * Dynamic config (app.config.js) supports environment variables
 * from .env files and EAS build profiles.
 *
 * Version strategy:
 *   - `version` = user-facing semver (1.0.0, 1.1.0, etc.)
 *   - `ios.buildNumber` = auto-incremented by EAS on production/beta builds
 *   - `android.versionCode` = auto-incremented by EAS on production/beta builds
 *   - `runtimeVersion` follows the appVersion policy so OTA updates
 *     only target the matching native binary version.
 */

const IS_PRODUCTION = process.env.APP_ENV === 'production';
const IS_BETA = process.env.APP_ENV === 'beta';

export default {
  expo: {
    name: IS_BETA ? "DealGapIQ (Beta)" : "DealGapIQ",
    slug: "dealgapiq",
    owner: "dealgapiq",
    version: "1.0.0",
    orientation: "portrait",
    icon: "./assets/icon.png",
    scheme: "dealgapiq",
    userInterfaceStyle: "automatic",
    newArchEnabled: true,

    splash: {
      image: "./assets/splash.png",
      resizeMode: "contain",
      backgroundColor: "#0A0F1C"
    },

    assetBundlePatterns: ["**/*"],

    // ─── iOS ──────────────────────────────────────────────────────
    ios: {
      supportsTablet: true,
      bundleIdentifier: "com.dealgapiq.mobile",
      buildNumber: "19",

      associatedDomains: [
        "applinks:dealgapiq.com",
        "applinks:www.dealgapiq.com"
      ],

      infoPlist: {
        // Camera & location permissions
        NSCameraUsageDescription:
          "DealGapIQ needs camera access to scan properties for instant investment analysis.",
        NSLocationWhenInUseUsageDescription:
          "DealGapIQ needs your location to identify properties you're looking at and show nearby investment opportunities.",
        NSLocationAlwaysAndWhenInUseUsageDescription:
          "DealGapIQ uses your location to identify properties and provide real-time investment analytics.",
        NSMotionUsageDescription:
          "DealGapIQ uses the compass to determine which direction you're facing when scanning properties.",

        // App Transport Security — disable for dev only
        ...(!IS_PRODUCTION && !IS_BETA
          ? {
              NSAppTransportSecurity: {
                NSAllowsLocalNetworking: true,
              },
            }
          : {}),

        // Export compliance
        ITSAppUsesNonExemptEncryption: false,

        // Background modes for push notifications
        UIBackgroundModes: ["remote-notification"],
      },

      // Privacy manifest (required by Apple since Spring 2024)
      privacyManifests: {
        NSPrivacyAccessedAPITypes: [
          {
            NSPrivacyAccessedAPIType:
              "NSPrivacyAccessedAPICategoryUserDefaults",
            NSPrivacyAccessedAPITypeReasons: ["CA92.1"],
          },
          {
            NSPrivacyAccessedAPIType:
              "NSPrivacyAccessedAPICategorySystemBootTime",
            NSPrivacyAccessedAPITypeReasons: ["35F9.1"],
          },
          {
            NSPrivacyAccessedAPIType:
              "NSPrivacyAccessedAPICategoryDiskSpace",
            NSPrivacyAccessedAPITypeReasons: ["E174.1"],
          },
          {
            NSPrivacyAccessedAPIType:
              "NSPrivacyAccessedAPICategoryFileTimestamp",
            NSPrivacyAccessedAPITypeReasons: ["C617.1"],
          },
        ],
        NSPrivacyCollectedDataTypes: [
          {
            NSPrivacyCollectedDataType: "NSPrivacyCollectedDataTypeEmailAddress",
            NSPrivacyCollectedDataTypeLinked: true,
            NSPrivacyCollectedDataTypeTracking: false,
            NSPrivacyCollectedDataTypePurposes: [
              "NSPrivacyCollectedDataTypePurposeAppFunctionality",
            ],
          },
          {
            NSPrivacyCollectedDataType: "NSPrivacyCollectedDataTypeDeviceID",
            NSPrivacyCollectedDataTypeLinked: false,
            NSPrivacyCollectedDataTypeTracking: false,
            NSPrivacyCollectedDataTypePurposes: [
              "NSPrivacyCollectedDataTypePurposeAnalytics",
            ],
          },
          {
            NSPrivacyCollectedDataType: "NSPrivacyCollectedDataTypeCrashData",
            NSPrivacyCollectedDataTypeLinked: false,
            NSPrivacyCollectedDataTypeTracking: false,
            NSPrivacyCollectedDataTypePurposes: [
              "NSPrivacyCollectedDataTypePurposeAppFunctionality",
            ],
          },
          {
            NSPrivacyCollectedDataType: "NSPrivacyCollectedDataTypePreciseLocation",
            NSPrivacyCollectedDataTypeLinked: false,
            NSPrivacyCollectedDataTypeTracking: false,
            NSPrivacyCollectedDataTypePurposes: [
              "NSPrivacyCollectedDataTypePurposeAppFunctionality",
            ],
          },
        ],
        NSPrivacyTracking: false,
      },

      config: {
        googleMapsApiKey: process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY,
      },
    },

    // ─── Android ──────────────────────────────────────────────────
    android: {
      adaptiveIcon: {
        foregroundImage: "./assets/adaptive-icon.png",
        backgroundColor: "#0A0F1C"
      },
      package: "com.dealgapiq.mobile",
      versionCode: 12,

      permissions: [
        "android.permission.CAMERA",
        "android.permission.ACCESS_FINE_LOCATION",
        "android.permission.ACCESS_COARSE_LOCATION",
        "android.permission.RECEIVE_BOOT_COMPLETED",
        "android.permission.VIBRATE",
      ],

      intentFilters: [
        {
          action: "VIEW",
          autoVerify: true,
          data: [
            { scheme: "https", host: "dealgapiq.com", pathPrefix: "/verdict" },
            { scheme: "https", host: "dealgapiq.com", pathPrefix: "/property" },
            { scheme: "https", host: "dealgapiq.com", pathPrefix: "/deal-gap" },
            { scheme: "https", host: "dealgapiq.com", pathPrefix: "/deal-maker" },
            { scheme: "https", host: "dealgapiq.com", pathPrefix: "/worksheet" },
            { scheme: "https", host: "dealgapiq.com", pathPrefix: "/price-intel" },
            { scheme: "https", host: "dealgapiq.com", pathPrefix: "/strategy" },
            { scheme: "https", host: "dealgapiq.com", pathPrefix: "/search" },
            { scheme: "https", host: "www.dealgapiq.com", pathPrefix: "/verdict" },
            { scheme: "https", host: "www.dealgapiq.com", pathPrefix: "/property" },
            { scheme: "https", host: "www.dealgapiq.com", pathPrefix: "/deal-gap" },
            { scheme: "https", host: "www.dealgapiq.com", pathPrefix: "/deal-maker" },
            { scheme: "https", host: "www.dealgapiq.com", pathPrefix: "/worksheet" },
            { scheme: "https", host: "www.dealgapiq.com", pathPrefix: "/price-intel" },
            { scheme: "https", host: "www.dealgapiq.com", pathPrefix: "/strategy" },
            { scheme: "https", host: "www.dealgapiq.com", pathPrefix: "/search" },
          ],
          category: ["BROWSABLE", "DEFAULT"],
        },
      ],

      config: {
        googleMaps: {
          apiKey: process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY,
        },
      },
    },

    // ─── Web ──────────────────────────────────────────────────────
    web: {
      bundler: "metro",
      output: "static",
      favicon: "./assets/favicon.png",
    },

    // ─── Plugins ──────────────────────────────────────────────────
    plugins: [
      "expo-router",
      [
        "expo-camera",
        {
          cameraPermission:
            "Allow DealGapIQ to access your camera to scan properties.",
        },
      ],
      [
        "expo-location",
        {
          locationAlwaysAndWhenInUsePermission:
            "Allow DealGapIQ to use your location to identify properties.",
          locationWhenInUsePermission:
            "Allow DealGapIQ to use your location to identify properties.",
        },
      ],
      [
        "expo-sensors",
        {
          motionPermission:
            "Allow DealGapIQ to access motion sensors for compass heading.",
        },
      ],
      "expo-sqlite",
      "expo-secure-store",
      [
        "expo-notifications",
        {
          icon: "./assets/icon.png",
          color: "#0891B2",
        },
      ],
      // Sentry source-map upload (requires SENTRY_AUTH_TOKEN in EAS secrets)
      ...(process.env.SENTRY_AUTH_TOKEN
        ? [
            [
              "@sentry/react-native/expo",
              {
                organization: process.env.SENTRY_ORG || "dealgapiq",
                project: process.env.SENTRY_PROJECT || "dealgapiq-mobile",
              },
            ],
          ]
        : []),
    ],

    // ─── Experiments ──────────────────────────────────────────────
    experiments: {
      typedRoutes: true,
    },

    // ─── Extra / EAS ──────────────────────────────────────────────
    extra: {
      router: {
        origin: false,
      },
      eas: {
        projectId: "c8258f15-a554-499a-a55f-adfc32d569d2",
      },
      webAppUrl: process.env.EXPO_PUBLIC_WEB_APP_URL || "https://dealgapiq.com",
    },

    // ─── OTA Updates ──────────────────────────────────────────────
    runtimeVersion: {
      policy: "appVersion",
    },
    updates: {
      url: "https://u.expo.dev/c8258f15-a554-499a-a55f-adfc32d569d2",
      fallbackToCacheTimeout: 3000,
      checkAutomatically: "ON_LOAD",
    },
  },
};
