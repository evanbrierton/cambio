import type { CapacitorConfig } from "@capacitor/cli";

const PRODUCTION_WEB_URL = "https://cambio.brierton.ie";

const serverUrl =
  process.env.CAPACITOR_SERVER_URL ??
  process.env.NEXT_PUBLIC_APP_URL ??
  PRODUCTION_WEB_URL;
const parsedServerUrl = new URL(serverUrl);
const cleartext =
  process.env.CAPACITOR_ALLOW_CLEARTEXT === "true" ||
  parsedServerUrl.protocol === "http:";
const allowNavigation = [
  parsedServerUrl.hostname,
  "cambio.brierton.ie",
  "cambio.brierton.workers.dev",
  "*.workers.dev",
  "*.partykit.dev",
  "localhost",
  "127.0.0.1",
];

const config: CapacitorConfig = {
  appId: "ie.brierton.cambio",
  appName: "Cambio",
  webDir: "web",
  backgroundColor: "#12061f",
  server: {
    url: serverUrl,
    cleartext,
    allowNavigation,
  },
  ios: {
    // contentInset never + Capacitor's default webView.scrollView.bounces=false
    // keep chrome from rubber-banding; nested CSS overflow:contain provides bounce.
    contentInset: "never",
    backgroundColor: "#12061f",
  },
  android: {
    // Document overscroll is suppressed via CSS; inner scrollports use contain.
    backgroundColor: "#12061f",
  },
  includePlugins: [
    "@capacitor/clipboard",
    "@capacitor/haptics",
    "@capacitor/share",
    "@capacitor/splash-screen",
    "@capacitor/status-bar",
  ],
  plugins: {
    SplashScreen: {
      launchShowDuration: 1000,
      launchAutoHide: true,
      backgroundColor: "#12061f",
      showSpinner: false,
    },
    StatusBar: {
      // Style.Dark = light status-bar icons on this dark shell.
      style: "DARK",
      backgroundColor: "#12061f",
      overlaysWebView: true,
    },
  },
};

export default config;
