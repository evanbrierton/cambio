import { spawnSync } from "node:child_process";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const bin = path.join(root, "node_modules", ".bin", "tailwind-lint");

const run = spawnSync(bin, ["--auto", "--format", "json"], {
  encoding: "utf8",
  cwd: root,
  env: process.env,
});

if (run.error) {
  process.exit(1);
}

if (!run.stdout?.trim()) {
  process.stderr.write(run.stderr || "tailwind-lint produced no output\n");
  process.exit(run.status ?? 1);
}

let payload;
try {
  payload = JSON.parse(run.stdout);
} catch {
  process.stderr.write(run.stderr || run.stdout);
  process.exit(1);
}

if (payload.error) {
  process.exit(1);
}

for (const file of payload.files ?? []) {
  if (file.diagnostics?.length === 0) {
    continue;
  }
  for (const _diagnostic of file.diagnostics) {
    // Diagnostics are counted via payload.summary below.
  }
}

const { errors = 0, warnings = 0 } = payload.summary ?? {};

if (errors === 0 && warnings === 0) {
  process.exit(0);
}
process.exit(1);
