import type { CapacitorConfig } from "@capacitor/cli";

const defaultSiteUrl =
  process.env.NEXT_PUBLIC_APP_URL ??
  (process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : "http://localhost:3000");

const serverUrl = process.env.CAPACITOR_SERVER_URL ?? defaultSiteUrl;
const parsedServerUrl = new URL(serverUrl);
const cleartext =
  process.env.CAPACITOR_ALLOW_CLEARTEXT === "true" ||
  parsedServerUrl.protocol === "http:";
const allowNavigation = [
  parsedServerUrl.hostname,
  "cambio.brierton.workers.dev",
  "*.workers.dev",
  "*.partykit.dev",
  "localhost",
  "127.0.0.1",
];

const config: CapacitorConfig = {
  appId: "dev.brierton.cambio",
  appName: "Cambio",
  webDir: "web",
  backgroundColor: "#12061f",
  server: {
    url: serverUrl,
    cleartext,
    allowNavigation,
  },
  ios: {
    contentInset: "never",
    backgroundColor: "#12061f",
  },
  android: {
    backgroundColor: "#12061f",
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 1000,
      launchAutoHide: true,
      backgroundColor: "#12061f",
      showSpinner: false,
    },
    StatusBar: {
      style: "LIGHT",
      backgroundColor: "#12061f",
      overlaysWebView: true,
    },
  },
};

export default config;
