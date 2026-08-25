import { mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const resourcesDir = path.join(__dirname, "..", "resources");
const iconSource =
  process.env.CAMBIO_ICON_URL ?? "https://cambio.brierton.ie/icon/512";

const background = "#12061f";

async function fetchIconBuffer() {
  const response = await fetch(iconSource);
  if (!response.ok) {
    throw new Error(
      `Failed to fetch icon from ${iconSource}: ${response.status}`,
    );
  }
  return Buffer.from(await response.arrayBuffer());
}

async function writeIcon(source) {
  const iconPath = path.join(resourcesDir, "icon.png");
  await sharp(source)
    .resize(1024, 1024, { fit: "contain", background })
    .png()
    .toFile(iconPath);
  return iconPath;
}

async function writeSplash(source) {
  const splashPath = path.join(resourcesDir, "splash.png");
  const logoSize = 512;
  const logo = await sharp(source)
    .resize(logoSize, logoSize, { fit: "contain", background })
    .png()
    .toBuffer();

  await sharp({
    create: {
      width: 2732,
      height: 2732,
      channels: 4,
      background,
    },
  })
    .composite([{ input: logo, gravity: "center" }])
    .png()
    .toFile(splashPath);

  return splashPath;
}

async function writeSplashDark() {
  const splashPath = path.join(resourcesDir, "splash-dark.png");
  await sharp(path.join(resourcesDir, "splash.png")).png().toFile(splashPath);
  return splashPath;
}

await mkdir(resourcesDir, { recursive: true });
const source = await fetchIconBuffer();
const iconPath = await writeIcon(source);
const splashPath = await writeSplash(source);
await writeSplashDark();

console.log(`Wrote ${iconPath}`);
console.log(`Wrote ${splashPath}`);
console.log(`Wrote ${path.join(resourcesDir, "splash-dark.png")}`);
