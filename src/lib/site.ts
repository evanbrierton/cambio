export const siteConfig = {
  name: "Cambio",
  shortName: "Cambio",
  title: "Cambio — Play Online",
  description: "Play Cambio online with friends. Lowest score wins.",
  tagline: "4 cards. Lowest score wins.",
  themeColor: "#12061f",
  backgroundColor: "#12061f",
  accent: "#ff00aa",
  accentAlt: "#00f5ff",
  surfaceCard: "#2d1b69",
} as const;

export function getSiteUrl(): URL {
  if (process.env.NEXT_PUBLIC_APP_URL) {
    return new URL(process.env.NEXT_PUBLIC_APP_URL);
  }
  if (process.env.VERCEL_URL) {
    return new URL(`https://${process.env.VERCEL_URL}`);
  }
  return new URL("http://localhost:3000");
}
