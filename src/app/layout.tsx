import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { ThemeProvider } from "@/context/ThemeProvider";
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
  title: "Cambio — Play Online",
  description: "Play Cambio online with friends. Lowest score wins.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full`}
      data-theme="retro"
      suppressHydrationWarning
    >
      <head>
        <script
          // biome-ignore lint/security/noDangerouslySetInnerHtml: inline theme bootstrap before paint
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem("cambio-theme");if(t)document.documentElement.dataset.theme=t;}catch(e){}})();`,
          }}
        />
      </head>
      <body className="min-h-full flex flex-col relative z-0">
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
