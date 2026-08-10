#!/usr/bin/env node

import { readFileSync } from "node:fs";
import path from "node:path";
import process from "node:process";
import { pathToFileURL } from "node:url";

export const DEFAULT_PARTY_HOST = "cambio.brierton.workers.dev";

export const WORKER_CHANGE_PREFIXES = ["party/", "src/game/"];
export const WORKER_CHANGE_FILES = ["wrangler.toml"];

export function hasWorkerChanges(changedFiles) {
  return changedFiles.some(
    (file) =>
      WORKER_CHANGE_FILES.includes(file) ||
      WORKER_CHANGE_PREFIXES.some((prefix) => file.startsWith(prefix)),
  );
}

const PR_ID_PATTERN = /^\d+$/;

export function previewWorkerName({ prId, branch } = {}) {
  if (prId && PR_ID_PATTERN.test(String(prId))) {
    return `cambio-pr-${prId}`;
  }

  const raw = String(branch ?? "preview")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40)
    .replace(/-+$/g, "");

  return `cambio-pr-${raw || "preview"}`;
}

export function partyHostForWorker(
  workerName,
  productionHost = DEFAULT_PARTY_HOST,
) {
  const suffix = productionHost.split(".").slice(1).join(".");
  return `${workerName}.${suffix}`;
}

function readLinesFromStdin() {
  return readFileSync(0, "utf8")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

function main(argv) {
  const [command, ...rest] = argv;

  if (command === "has-changes") {
    const files = rest.length > 0 ? rest : readLinesFromStdin();
    process.exit(hasWorkerChanges(files) ? 0 : 1);
  }

  if (command === "worker-name") {
    const prId = process.env.VERCEL_GIT_PULL_REQUEST_ID ?? "";
    const branch = process.env.VERCEL_GIT_COMMIT_REF ?? rest[0] ?? "preview";
    process.stdout.write(`${previewWorkerName({ prId, branch })}\n`);
    return;
  }

  if (command === "party-host") {
    const workerName = rest[0];
    if (!workerName) {
      process.exit(2);
    }
    process.stdout.write(`${partyHostForWorker(workerName)}\n`);
    return;
  }
  process.exit(2);
}

const isMain =
  process.argv[1] &&
  import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href;

if (isMain) {
  main(process.argv.slice(2));
}
