import { renderIcon } from "@/lib/brand-image";

export function generateImageMetadata() {
  return [
    { id: "32", size: { width: 32, height: 32 }, contentType: "image/png" },
    {
      id: "192",
      size: { width: 192, height: 192 },
      contentType: "image/png",
    },
    {
      id: "512",
      size: { width: 512, height: 512 },
      contentType: "image/png",
    },
  ];
}

export default async function Icon({ id }: { id: Promise<string | number> }) {
  const size = Number(await id);
  return renderIcon(size);
}
