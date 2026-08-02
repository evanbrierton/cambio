import { renderIcon } from "@/lib/brand-image";

export const runtime = "edge";

export async function GET() {
  return renderIcon(192);
}
