import type { ConfigContext, ExpoConfig } from "expo/config";

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: "Cambio",
  slug: "cambio",
  version: "0.1.0",
  orientation: "portrait",
  scheme: "cambio",
  userInterfaceStyle: "automatic",
  newArchEnabled: true,
  ios: {
    supportsTablet: true,
    bundleIdentifier: "dev.brierton.cambio",
  },
  android: {
    adaptiveIcon: {
      backgroundColor: "#12061f",
    },
    package: "dev.brierton.cambio",
  },
  web: {
    bundler: "metro",
    output: "static",
  },
  plugins: ["expo-router", "expo-font"],
  experiments: {
    typedRoutes: true,
  },
  extra: {
    partyHost:
      process.env.EXPO_PUBLIC_PARTY_HOST ?? "localhost:8787",
  },
});
