import type { CapacitorConfig } from "@capacitor/cli";

const defaultSiteUrl =
  process.env.NEXT_PUBLIC_APP_URL ??
  (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");

const serverUrl = process.env.CAPACITOR_SERVER_URL ?? defaultSiteUrl;
const parsedServerUrl = new URL(serverUrl);
const cleartext =
  process.env.CAPACITOR_ALLOW_CLEARTEXT === "true" || parsedServerUrl.protocol === "http:";
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
  server: {
    url: serverUrl,
    cleartext,
    allowNavigation,
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 1000,
      launchAutoHide: true,
      backgroundColor: "#12061f",
      showSpinner: false,
    },
    StatusBar: {
      style: "DARK",
      backgroundColor: "#12061f",
      overlaysWebView: false,
    },
  },
};

export default config;
