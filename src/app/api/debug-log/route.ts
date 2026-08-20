import { appendFile, mkdir } from "node:fs/promises";
import { dirname } from "node:path";

const DEBUG_LOG = "/opt/cursor/logs/debug.log";

/** Temporary CAM-67 debug sink. Do not ship. */
export async function POST(req: Request): Promise<Response> {
  const body = (await req.json()) as Record<string, unknown>;
  await mkdir(dirname(DEBUG_LOG), { recursive: true });
  await appendFile(DEBUG_LOG, `${JSON.stringify(body)}\n`);
  return new Response("ok");
}
