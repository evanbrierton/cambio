import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { cookies } from "next/headers";
import { PwaInstallPrompt } from "@/components/PwaInstallPrompt";
import { PwaRegistrar } from "@/components/PwaRegistrar";
import { ThemeProvider } from "@/context/ThemeProvider";
import { getSiteUrl, siteConfig } from "@/lib/site";
import {
  APPEARANCE_COOKIE_KEY,
  APPEARANCE_MEDIA_QUERY,
  DEFAULT_APPEARANCE,
  parseAppearanceCookie,
  parseThemeCookie,
  resolveAppearance,
  THEME_COOKIE_KEY,
} from "@/lib/theme-cookie";
import { getThemeFontClassName } from "@/lib/theme-fonts";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: getSiteUrl(),
  title: siteConfig.title,
  description: siteConfig.description,
  applicationName: siteConfig.name,
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: siteConfig.shortName,
  },
  formatDetection: {
    telephone: false,
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "/",
    siteName: siteConfig.name,
    title: siteConfig.title,
    description: siteConfig.description,
    images: [
      {
        url: "/opengraph-image",
        width: 1200,
        height: 630,
        alt: `${siteConfig.name} — Play online with friends`,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: siteConfig.title,
    description: siteConfig.description,
    images: ["/twitter-image"],
  },
  icons: {
    icon: [
      { url: "/icon/32", sizes: "32x32", type: "image/png" },
      { url: "/icon/192", sizes: "192x192", type: "image/png" },
      { url: "/icon/512", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/apple-icon", sizes: "180x180", type: "image/png" }],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: siteConfig.themeColor,
};

const APPEARANCE_INIT_SCRIPT = `
(() => {
  const root = document.documentElement;
  const key = ${JSON.stringify(APPEARANCE_COOKIE_KEY)};
  const fallback = ${JSON.stringify(DEFAULT_APPEARANCE)};
  const cookieValue = document.cookie
    .split("; ")
    .find((entry) => entry.startsWith(key + "="))
    ?.slice(key.length + 1);
  const preference = cookieValue ?? fallback;
  const resolved = preference === "system"
    ? (window.matchMedia(${JSON.stringify(APPEARANCE_MEDIA_QUERY)}).matches ? "dark" : "light")
    : preference;
  root.dataset.appearance = resolved;
  root.style.colorScheme = resolved;
})();
`;

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const cookieStore = await cookies();
  const theme = parseThemeCookie(cookieStore.get(THEME_COOKIE_KEY)?.value);
  const appearancePreference = parseAppearanceCookie(
    cookieStore.get(APPEARANCE_COOKIE_KEY)?.value,
  );
  const appearance = resolveAppearance(appearancePreference, false);
  const themeFontClass = getThemeFontClassName(theme);

  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${themeFontClass} h-full`}
      data-theme={theme}
      data-appearance={appearance}
      style={{ backgroundColor: "var(--background)", colorScheme: appearance }}
      suppressHydrationWarning
    >
      <head>
        <script id="cambio-appearance-init">{APPEARANCE_INIT_SCRIPT}</script>
      </head>
      <body className="min-h-full flex flex-col relative z-0">
        <PwaRegistrar />
        <ThemeProvider
          initialTheme={theme}
          initialAppearancePreference={appearancePreference}
        >
          {children}
          <PwaInstallPrompt />
        </ThemeProvider>
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
