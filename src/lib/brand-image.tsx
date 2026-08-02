import { ImageResponse } from "next/og";
import { siteConfig } from "@/lib/site";

let displayFont: ArrayBuffer | null = null;

export async function loadDisplayFont(): Promise<ArrayBuffer> {
  if (displayFont) return displayFont;

  const response = await fetch(
    "https://raw.githubusercontent.com/google/fonts/main/ofl/pressstart2p/PressStart2P-Regular.ttf",
  );
  displayFont = await response.arrayBuffer();
  return displayFont;
}

export function CambioIconMarkup(size: number) {
  const border = Math.max(2, Math.round(size * 0.03));
  const letterSize = Math.round(size * 0.3);
  const cardW = Math.round(size * 0.14);
  const cardH = Math.round(size * 0.2);
  const inset = Math.round(size * 0.14);

  return (
    <div
      style={{
        width: size,
        height: size,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: siteConfig.backgroundColor,
        backgroundImage:
          "radial-gradient(ellipse 80% 50% at 50% -10%, rgba(255, 0, 170, 0.35), transparent), radial-gradient(ellipse 60% 40% at 100% 100%, rgba(0, 245, 255, 0.2), transparent)",
      }}
    >
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          width: size - inset * 2,
          height: size - inset * 2,
          border: `${border}px solid ${siteConfig.accentAlt}`,
          boxShadow: `0 0 ${Math.round(size * 0.08)}px rgba(255, 0, 170, 0.6), 0 0 ${Math.round(size * 0.12)}px rgba(0, 245, 255, 0.35)`,
          background: siteConfig.surfaceCard,
        }}
      >
        <div
          style={{
            fontFamily: "PressStart",
            fontSize: letterSize,
            color: siteConfig.accent,
            textShadow: `0 0 ${Math.round(size * 0.04)}px #ff6ec7`,
            marginBottom: Math.round(size * 0.05),
          }}
        >
          C
        </div>
        <div style={{ display: "flex", gap: Math.round(size * 0.02) }}>
          {[0, 1, 2, 3].map((index) => (
            <div
              key={index}
              style={{
                width: cardW,
                height: cardH,
                background: index % 2 === 0 ? "#1a0a2e" : "#3d2b79",
                border: `${Math.max(1, Math.round(size * 0.012))}px solid ${siteConfig.accentAlt}`,
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

export async function renderIcon(size: number) {
  const font = await loadDisplayFont();

  return new ImageResponse(CambioIconMarkup(size), {
    width: size,
    height: size,
    fonts: [{ name: "PressStart", data: font, style: "normal", weight: 400 }],
  });
}

export function CambioShareMarkup() {
  const width = 1200;
  const height = 630;

  return (
    <div
      style={{
        width,
        height,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        background: siteConfig.backgroundColor,
        backgroundImage:
          "radial-gradient(ellipse 80% 50% at 50% -10%, rgba(255, 0, 170, 0.28), transparent), radial-gradient(ellipse 60% 40% at 100% 100%, rgba(0, 245, 255, 0.16), transparent)",
        padding: "48px",
      }}
    >
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          border: "4px solid #00f5ff",
          boxShadow:
            "0 0 24px rgba(255, 0, 170, 0.55), 0 0 40px rgba(0, 245, 255, 0.35)",
          background: "rgba(45, 27, 105, 0.85)",
          padding: "56px 72px",
          width: "100%",
          maxWidth: 960,
        }}
      >
        <div
          style={{
            fontFamily: "PressStart",
            fontSize: 28,
            color: "#6dd4d8",
            letterSpacing: "0.12em",
            marginBottom: 24,
          }}
        >
          INSERT COIN
        </div>
        <div
          style={{
            fontFamily: "PressStart",
            fontSize: 72,
            color: siteConfig.accent,
            textShadow: "0 0 12px #ff6ec7, 0 0 28px rgba(255, 0, 170, 0.65)",
            marginBottom: 32,
          }}
        >
          Cambio
        </div>
        <div
          style={{
            fontFamily: "PressStart",
            fontSize: 22,
            color: siteConfig.accentAlt,
            textAlign: "center",
            lineHeight: 1.6,
            maxWidth: 720,
          }}
        >
          {siteConfig.tagline}
        </div>
        <div
          style={{
            display: "flex",
            gap: 16,
            marginTop: 40,
          }}
        >
          {[0, 1, 2, 3].map((index) => (
            <div
              key={index}
              style={{
                width: 72,
                height: 100,
                background: index % 2 === 0 ? "#1a0a2e" : "#3d2b79",
                border: "3px solid #00f5ff",
                boxShadow: "0 0 12px rgba(0, 245, 255, 0.35)",
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

export async function renderShareImage() {
  const font = await loadDisplayFont();

  return new ImageResponse(CambioShareMarkup(), {
    width: 1200,
    height: 630,
    fonts: [{ name: "PressStart", data: font, style: "normal", weight: 400 }],
  });
}
