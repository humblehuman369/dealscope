/**
 * Expo app configuration
 * Converted from app.json to support environment variables
 */
export default {
  expo: {
    name: "InvestIQ",
    slug: "investiq",
    version: "1.0.0",
    orientation: "portrait",
    icon: "./assets/icon.png",
    scheme: "investiq",
    userInterfaceStyle: "automatic",
    newArchEnabled: true,
    splash: {
      image: "./assets/splash.png",
      resizeMode: "contain",
      backgroundColor: "#E8EDF5"
    },
    assetBundlePatterns: ["**/*"],
    ios: {
      supportsTablet: true,
      bundleIdentifier: "com.investiq.mobile",
      buildNumber: "19",
      associatedDomains: [
        "applinks:investiq.guru",
        "applinks:www.investiq.guru"
      ],
      infoPlist: {
        NSCameraUsageDescription: "InvestIQ needs camera access to scan properties for instant investment analysis.",
        NSLocationWhenInUseUsageDescription: "InvestIQ needs your location to identify properties you're looking at and show nearby investment opportunities.",
        NSLocationAlwaysAndWhenInUseUsageDescription: "InvestIQ uses your location to identify properties and provide real-time investment analytics.",
        NSMotionUsageDescription: "InvestIQ uses the compass to determine which direction you're facing when scanning properties.",
        ITSAppUsesNonExemptEncryption: false
      },
      config: {
        googleMapsApiKey: process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY
      }
    },
    android: {
      adaptiveIcon: {
        foregroundImage: "./assets/adaptive-icon.png",
        backgroundColor: "#E8EDF5"
      },
      package: "com.investiq.mobile",
      versionCode: 12,
      permissions: [
        "android.permission.CAMERA",
        "android.permission.ACCESS_FINE_LOCATION",
        "android.permission.ACCESS_COARSE_LOCATION",
        "android.permission.RECORD_AUDIO"
      ],
      intentFilters: [
        {
          action: "VIEW",
          autoVerify: true,
          data: [
            { scheme: "https", host: "investiq.guru", pathPrefix: "/verdict" },
            { scheme: "https", host: "investiq.guru", pathPrefix: "/property" },
            { scheme: "https", host: "investiq.guru", pathPrefix: "/deal-gap" },
            { scheme: "https", host: "investiq.guru", pathPrefix: "/deal-maker" },
            { scheme: "https", host: "investiq.guru", pathPrefix: "/worksheet" },
            { scheme: "https", host: "investiq.guru", pathPrefix: "/price-intel" },
            { scheme: "https", host: "investiq.guru", pathPrefix: "/strategy" },
            { scheme: "https", host: "investiq.guru", pathPrefix: "/search" },
            { scheme: "https", host: "www.investiq.guru", pathPrefix: "/verdict" },
            { scheme: "https", host: "www.investiq.guru", pathPrefix: "/property" },
            { scheme: "https", host: "www.investiq.guru", pathPrefix: "/deal-gap" },
            { scheme: "https", host: "www.investiq.guru", pathPrefix: "/deal-maker" },
            { scheme: "https", host: "www.investiq.guru", pathPrefix: "/worksheet" },
            { scheme: "https", host: "www.investiq.guru", pathPrefix: "/price-intel" },
            { scheme: "https", host: "www.investiq.guru", pathPrefix: "/strategy" },
            { scheme: "https", host: "www.investiq.guru", pathPrefix: "/search" },
          ],
          category: ["BROWSABLE", "DEFAULT"]
        }
      ],
      config: {
        googleMaps: {
          apiKey: process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY
        }
      }
    },
    web: {
      bundler: "metro",
      output: "static",
      favicon: "./assets/favicon.png"
    },
    plugins: [
      "expo-router",
      [
        "expo-camera",
        {
          cameraPermission: "Allow InvestIQ to access your camera to scan properties."
        }
      ],
      [
        "expo-location",
        {
          locationAlwaysAndWhenInUsePermission: "Allow InvestIQ to use your location to identify properties.",
          locationWhenInUsePermission: "Allow InvestIQ to use your location to identify properties."
        }
      ],
      [
        "expo-sensors",
        {
          motionPermission: "Allow InvestIQ to access motion sensors for compass heading."
        }
      ],
      "expo-sqlite",
      [
        "expo-notifications",
        {
          icon: "./assets/icon.png",
          color: "#4F46E5"
        }
      ]
    ],
    experiments: {
      typedRoutes: true
    },
    extra: {
      router: {
        origin: false
      },
      eas: {
        projectId: "c8258f15-a554-499a-a55f-adfc32d569d2"
      },
      webAppUrl: "https://investiq.guru"
    },
    runtimeVersion: {
      policy: "appVersion"
    },
    updates: {
      url: "https://u.expo.dev/c8258f15-a554-499a-a55f-adfc32d569d2"
    }
  }
};
