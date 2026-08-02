import { renderShareImage } from "@/lib/brand-image";

export const alt = "Cambio — Play online with friends";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpenGraphImage() {
  return renderShareImage();
}
