import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { cookies } from "next/headers";
import { PwaRegistrar } from "@/components/PwaRegistrar";
import { ThemeProvider } from "@/context/ThemeProvider";
import { getSiteUrl, siteConfig } from "@/lib/site";
import { getThemeFontClassName } from "@/lib/theme-fonts";
import { parseThemeCookie, THEME_COOKIE_KEY } from "@/lib/theme-cookie";
import { THEME_BACKGROUNDS } from "@/lib/themes";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const THEME_MIGRATE_SCRIPT = `(function(){try{var b={retro:"#12061f",casino:"#0a1f12",party:"#1a0a3e",minimal:"#0c0c10",calm:"#f4f0ea",library:"#1c1410",lodge:"#0f1a14",ink:"#f5f0e8"};var k="cambio-theme",s=localStorage.getItem(k);if(s){localStorage.removeItem(k);var v=["retro","casino","party","minimal","calm","library","lodge","ink"];if(v.indexOf(s)!==-1){document.documentElement.dataset.theme=s;document.documentElement.style.backgroundColor=b[s];document.cookie="cambio-theme="+s+";path=/;max-age=31536000;SameSite=Lax"}}else{var t=document.documentElement.dataset.theme;if(t&&b[t])document.documentElement.style.backgroundColor=b[t]}}catch(e){}})();`;

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

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const cookieStore = await cookies();
  const theme = parseThemeCookie(cookieStore.get(THEME_COOKIE_KEY)?.value);
  const themeFontClass = getThemeFontClassName(theme);

  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${themeFontClass} h-full`}
      data-theme={theme}
      style={{ backgroundColor: THEME_BACKGROUNDS[theme] }}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_MIGRATE_SCRIPT }} />
      </head>
      <body className="min-h-full flex flex-col relative z-0">
        <PwaRegistrar />
        <ThemeProvider initialTheme={theme}>{children}</ThemeProvider>
      </body>
    </html>
  );
}
