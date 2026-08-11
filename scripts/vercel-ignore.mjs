#!/usr/bin/env node

/**
 * Vercel Ignored Build Step helper.
 *
 * Exit 0 = skip build, Exit 1 = proceed (Vercel convention).
 *
 * Skips when:
 * - Only irrelevant files changed (tests, docs, CI, Worker backend, …)
 * - The PR is still a draft
 *
 * Production and ready PRs with relevant Next.js changes always build.
 * Missing git/API context fails open (build).
 */

import { execFileSync } from "node:child_process";
import path from "node:path";
import { pathToFileURL } from "node:url";

export const EXIT_SKIP = 0;
export const EXIT_BUILD = 1;

export const IRRELEVANT_PATH_PREFIXES = [
  ".github/",
  ".cursor/",
  // Cloudflare Worker / PartyKit backend — not part of the Next.js Vercel app.
  // (src/game/ stays relevant: the client imports shared types/cards/wire-schema.)
  "party/",
];

export const IRRELEVANT_FILES = new Set([
  "BUGS.md",
  "README.md",
  "biome.json",
  "vitest.config.mts",
  "wrangler.toml",
  "scripts/dev-lan.sh",
  "scripts/tailwind-lint.mjs",
  "scripts/vercel-ignore.mjs",
  "scripts/vercel-ignore.test.ts",
  "scripts/preview-worker.test.ts",
]);

/**
 * @param {string} file
 */
export function isIrrelevantPath(file) {
  const normalized = String(file).replace(/^\.\//, "").replace(/\\/g, "/");
  if (!normalized) return true;
  if (IRRELEVANT_FILES.has(normalized)) return true;
  if (
    IRRELEVANT_PATH_PREFIXES.some((prefix) => normalized.startsWith(prefix))
  ) {
    return true;
  }
  if (/\.(md|mdx)$/i.test(normalized)) return true;
  if (/\.(test|spec)\.(ts|tsx|js|jsx|mjs|cjs)$/i.test(normalized)) return true;
  const base = normalized.split("/").pop() ?? "";
  if (/^vitest\.config\./i.test(base)) return true;
  return false;
}

/**
 * @param {string[]} files
 */
export function hasRelevantChanges(files) {
  return files.some((file) => !isIrrelevantPath(file));
}

/**
 * @param {{
 *   vercelEnv?: string | null;
 *   prId?: string | null;
 *   draft?: boolean | null;
 *   apiError?: string | null;
 *   onlyIrrelevant?: boolean | null;
 * }} input
 */
export function decideIgnore({
  vercelEnv = null,
  prId = null,
  draft = null,
  apiError = null,
  onlyIrrelevant = null,
} = {}) {
  if (onlyIrrelevant === true) {
    return {
      exit: EXIT_SKIP,
      reason: "Only tests/docs/CI (irrelevant) files changed — skipping",
    };
  }

  if (vercelEnv === "production") {
    return { exit: EXIT_BUILD, reason: "Production — building" };
  }

  if (!prId) {
    return { exit: EXIT_BUILD, reason: "No PR — building" };
  }

  if (apiError) {
    return {
      exit: EXIT_BUILD,
      reason: `PR #${prId} draft check failed (${apiError}) — building`,
    };
  }

  if (draft === true) {
    return {
      exit: EXIT_SKIP,
      reason: `PR #${prId} is a draft — skipping preview`,
    };
  }

  if (draft === false) {
    return { exit: EXIT_BUILD, reason: `PR #${prId} is ready — building` };
  }

  return {
    exit: EXIT_BUILD,
    reason: `PR #${prId} draft status unknown — building`,
  };
}

/**
 * @param {{
 *   owner: string;
 *   repo: string;
 *   prId: string;
 *   token?: string | null;
 *   fetchImpl?: typeof fetch;
 * }} opts
 * @returns {Promise<{ draft: boolean | null; error: string | null }>}
 */
export async function fetchPrDraft({
  owner,
  repo,
  prId,
  token = null,
  fetchImpl = fetch,
}) {
  const headers = {
    Accept: "application/vnd.github+json",
    "User-Agent": "cambio-vercel-ignore",
    "X-GitHub-Api-Version": "2022-11-28",
  };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  let response;
  try {
    response = await fetchImpl(
      `https://api.github.com/repos/${owner}/${repo}/pulls/${prId}`,
      { headers },
    );
  } catch (err) {
    return {
      draft: null,
      error: err instanceof Error ? err.message : String(err),
    };
  }

  if (!response.ok) {
    return {
      draft: null,
      error: `HTTP ${response.status}`,
    };
  }

  let body;
  try {
    body = await response.json();
  } catch (err) {
    return {
      draft: null,
      error: err instanceof Error ? err.message : "invalid JSON",
    };
  }

  if (typeof body?.draft !== "boolean") {
    return { draft: null, error: "missing draft field" };
  }

  return { draft: body.draft, error: null };
}

/**
 * @param {{ previousSha?: string | null; head?: string }} opts
 * @returns {string[] | null} null = could not determine (fail open)
 */
export function listChangedFiles({ previousSha = null, head = "HEAD" } = {}) {
  if (!previousSha) return null;

  try {
    const out = execFileSync(
      "git",
      ["diff", "--name-only", `${previousSha}...${head}`],
      {
        encoding: "utf8",
        stdio: ["ignore", "pipe", "ignore"],
      },
    );
    return out
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);
  } catch {
    return null;
  }
}

/**
 * @param {Record<string, string | undefined>} env
 * @param {{
 *   fetchImpl?: typeof fetch;
 *   listChangedFilesImpl?: typeof listChangedFiles;
 * }} [opts]
 */
export async function runIgnoreCheck(
  env,
  { fetchImpl = fetch, listChangedFilesImpl = listChangedFiles } = {},
) {
  const vercelEnv = env.VERCEL_ENV ?? null;
  const prId = env.VERCEL_GIT_PULL_REQUEST_ID ?? null;
  const previousSha = env.VERCEL_GIT_PREVIOUS_SHA ?? null;

  const changedFiles = listChangedFilesImpl({ previousSha });
  if (changedFiles && !hasRelevantChanges(changedFiles)) {
    return decideIgnore({ vercelEnv, prId, onlyIrrelevant: true });
  }

  if (vercelEnv === "production" || !prId) {
    return decideIgnore({ vercelEnv, prId });
  }

  const owner = env.VERCEL_GIT_REPO_OWNER;
  const repo = env.VERCEL_GIT_REPO_SLUG;
  if (!owner || !repo) {
    return decideIgnore({
      vercelEnv,
      prId,
      apiError: "missing VERCEL_GIT_REPO_OWNER/SLUG",
    });
  }

  const token = env.GITHUB_DRAFT_CHECK_TOKEN || null;
  const { draft, error } = await fetchPrDraft({
    owner,
    repo,
    prId,
    token,
    fetchImpl,
  });

  return decideIgnore({
    vercelEnv,
    prId,
    draft,
    apiError: error,
  });
}

async function main() {
  const decision = await runIgnoreCheck(process.env);
  console.log(decision.reason);
  process.exit(decision.exit);
}

const isMain =
  process.argv[1] &&
  import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href;

if (isMain) {
  main().catch((err) => {
    console.error(
      `Ignore check crashed (${err instanceof Error ? err.message : err}) — building`,
    );
    process.exit(EXIT_BUILD);
  });
}
