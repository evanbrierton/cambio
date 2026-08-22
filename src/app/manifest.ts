import type { MetadataRoute } from "next";
import { siteConfig } from "@/lib/site";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: siteConfig.title,
    short_name: siteConfig.shortName,
    description: siteConfig.description,
    lang: "en",
    dir: "ltr",
    start_url: "/",
    scope: "/",
    display: "standalone",
    display_override: ["standalone", "minimal-ui"],
    orientation: "portrait",
    background_color: siteConfig.backgroundColor,
    theme_color: siteConfig.themeColor,
    categories: ["games", "entertainment"],
    prefer_related_applications: false,
    shortcuts: [
      {
        name: "Create lobby",
        short_name: "Lobby",
        url: "/",
        description: "Create a lobby and add bots or friends",
      },
    ],
    icons: [
      {
        src: "/icon/192",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icon/512",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icon/512",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
