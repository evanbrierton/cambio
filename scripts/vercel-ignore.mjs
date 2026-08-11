#!/usr/bin/env node

/**
 * Vercel Ignored Build Step helper.
 *
 * Exit 0 = skip build, Exit 1 = proceed (Vercel convention).
 * Draft PRs skip preview builds; production and ready PRs always build.
 * GitHub API failures fail open (build) so previews are never stuck skipped.
 */

import { pathToFileURL } from "node:url";
import path from "node:path";

export const EXIT_SKIP = 0;
export const EXIT_BUILD = 1;

/**
 * @param {{
 *   vercelEnv?: string | null;
 *   prId?: string | null;
 *   draft?: boolean | null;
 *   apiError?: string | null;
 * }} input
 */
export function decideIgnore({
  vercelEnv = null,
  prId = null,
  draft = null,
  apiError = null,
} = {}) {
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
 * @param {NodeJS.ProcessEnv} env
 * @param {{ fetchImpl?: typeof fetch }} [opts]
 */
export async function runIgnoreCheck(env, { fetchImpl = fetch } = {}) {
  const vercelEnv = env.VERCEL_ENV ?? null;
  const prId = env.VERCEL_GIT_PULL_REQUEST_ID ?? null;

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
      `Draft check crashed (${err instanceof Error ? err.message : err}) — building`,
    );
    process.exit(EXIT_BUILD);
  });
}
