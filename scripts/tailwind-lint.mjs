import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const bin = path.join(root, "node_modules", ".bin", "tailwind-lint");

const run = spawnSync(bin, ["--auto", "--format", "json"], {
  encoding: "utf8",
  cwd: root,
  env: process.env,
});

if (run.error) {
  console.error(run.error.message);
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
  console.error(payload.error);
  process.exit(1);
}

for (const file of payload.files ?? []) {
  if (!file.diagnostics?.length) continue;
  console.log(`\n${file.path}`);
  for (const diagnostic of file.diagnostics) {
    console.log(
      `  ${diagnostic.line}:${diagnostic.column}  ${diagnostic.severity}  ${diagnostic.message}  (${diagnostic.code})`,
    );
  }
}

const { errors = 0, warnings = 0 } = payload.summary ?? {};

if (errors === 0 && warnings === 0) {
  console.log("✔ No issues found");
  process.exit(0);
}

console.error(`\nFound ${errors} error(s) and ${warnings} warning(s)`);
process.exit(1);
