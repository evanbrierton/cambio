import {
  Fredoka,
  Libre_Baskerville,
  Lora,
  Noto_Serif_JP,
  Playfair_Display,
  Press_Start_2P,
} from "next/font/google";
import type { ThemeId } from "@/lib/themes";

const pressStart2P = Press_Start_2P({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-press-start-2p",
  display: "swap",
  preload: true,
  adjustFontFallback: true,
});

const playfairDisplay = Playfair_Display({
  weight: ["600", "700"],
  subsets: ["latin"],
  variable: "--font-playfair",
  display: "swap",
  preload: false,
  adjustFontFallback: true,
});

const fredoka = Fredoka({
  weight: ["500", "600"],
  subsets: ["latin"],
  variable: "--font-fredoka",
  display: "swap",
  preload: false,
  adjustFontFallback: true,
});

const libreBaskerville = Libre_Baskerville({
  weight: ["400", "700"],
  subsets: ["latin"],
  variable: "--font-libre-baskerville",
  display: "swap",
  preload: false,
  adjustFontFallback: true,
});

const lora = Lora({
  weight: ["500", "600", "700"],
  subsets: ["latin"],
  variable: "--font-lora",
  display: "swap",
  preload: false,
  adjustFontFallback: true,
});

const notoSerifJP = Noto_Serif_JP({
  weight: ["400", "500", "600"],
  subsets: ["latin"],
  variable: "--font-noto-serif-jp",
  display: "swap",
  preload: false,
  adjustFontFallback: true,
});

const THEME_FONT_CLASSES: Record<ThemeId, string> = {
  retro: pressStart2P.variable,
  casino: playfairDisplay.variable,
  party: fredoka.variable,
  minimal: "",
  calm: "",
  library: libreBaskerville.variable,
  lodge: lora.variable,
  ink: notoSerifJP.variable,
};

export function getThemeFontClassName(theme: ThemeId): string {
  return THEME_FONT_CLASSES[theme];
}

export function applyThemeFontClass(theme: ThemeId): void {
  const html = document.documentElement;
  const next = THEME_FONT_CLASSES[theme];
  for (const className of Object.values(THEME_FONT_CLASSES)) {
    if (className && className !== next) html.classList.remove(className);
  }
  if (next && !html.classList.contains(next)) html.classList.add(next);
}
