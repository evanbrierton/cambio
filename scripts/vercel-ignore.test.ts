import { describe, expect, it, vi } from "vitest";
import {
  decideIgnore,
  EXIT_BUILD,
  EXIT_SKIP,
  fetchPrDraft,
  hasRelevantChanges,
  isIrrelevantPath,
  runIgnoreCheck,
} from "./vercel-ignore.mjs";

describe("isIrrelevantPath / hasRelevantChanges", () => {
  it("treats tests, docs, CI, and Worker backend paths as irrelevant", () => {
    expect(isIrrelevantPath("src/game/engine.test.ts")).toBe(true);
    expect(isIrrelevantPath("scripts/preview-worker.test.ts")).toBe(true);
    expect(isIrrelevantPath("README.md")).toBe(true);
    expect(isIrrelevantPath(".github/workflows/ci.yml")).toBe(true);
    expect(isIrrelevantPath("biome.json")).toBe(true);
    expect(isIrrelevantPath("vitest.config.mts")).toBe(true);
    expect(isIrrelevantPath("party/cambio.ts")).toBe(true);
    expect(isIrrelevantPath("party/worker.ts")).toBe(true);
    expect(isIrrelevantPath("wrangler.toml")).toBe(true);
  });

  it("treats Next.js app paths as relevant", () => {
    expect(isIrrelevantPath("src/app/page.tsx")).toBe(false);
    expect(isIrrelevantPath("src/game/types.ts")).toBe(false);
    expect(isIrrelevantPath("scripts/vercel-build.sh")).toBe(false);
    expect(isIrrelevantPath("package.json")).toBe(false);
    expect(isIrrelevantPath("vercel.json")).toBe(false);
  });

  it("is false when every changed file is irrelevant", () => {
    expect(
      hasRelevantChanges([
        "src/game/engine.test.ts",
        "README.md",
        ".github/workflows/ci.yml",
        "party/cambio.ts",
        "wrangler.toml",
      ]),
    ).toBe(false);
  });

  it("is true when any changed file is relevant", () => {
    expect(
      hasRelevantChanges(["README.md", "src/components/GameTable.tsx"]),
    ).toBe(true);
    expect(hasRelevantChanges(["party/cambio.ts", "src/game/types.ts"])).toBe(
      true,
    );
  });
});

describe("decideIgnore", () => {
  it("always builds production when changes are relevant", () => {
    expect(
      decideIgnore({ vercelEnv: "production", prId: "12", draft: true }),
    ).toMatchObject({ exit: EXIT_BUILD });
  });

  it("skips when only irrelevant files changed", () => {
    expect(
      decideIgnore({
        vercelEnv: "production",
        onlyIrrelevant: true,
      }),
    ).toMatchObject({ exit: EXIT_SKIP });
  });

  it("builds when there is no PR context", () => {
    expect(decideIgnore({ vercelEnv: "preview" })).toMatchObject({
      exit: EXIT_BUILD,
    });
  });

  it("skips draft PRs", () => {
    expect(
      decideIgnore({ vercelEnv: "preview", prId: "12", draft: true }),
    ).toMatchObject({ exit: EXIT_SKIP });
  });

  it("builds ready PRs", () => {
    expect(
      decideIgnore({ vercelEnv: "preview", prId: "12", draft: false }),
    ).toMatchObject({ exit: EXIT_BUILD });
  });

  it("fails open when the draft API errors", () => {
    expect(
      decideIgnore({
        vercelEnv: "preview",
        prId: "12",
        apiError: "HTTP 403",
      }),
    ).toMatchObject({ exit: EXIT_BUILD });
  });
});

describe("fetchPrDraft", () => {
  it("reads draft from the GitHub API payload", async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ draft: true }),
    });

    await expect(
      fetchPrDraft({
        owner: "evanbrierton",
        repo: "cambio",
        prId: "173",
        token: "secret",
        fetchImpl,
      }),
    ).resolves.toEqual({ draft: true, error: null });

    expect(fetchImpl).toHaveBeenCalledWith(
      "https://api.github.com/repos/evanbrierton/cambio/pulls/173",
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: "Bearer secret",
        }),
      }),
    );
  });

  it("returns an error on non-OK responses", async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: false,
      status: 403,
      json: async () => ({}),
    });

    await expect(
      fetchPrDraft({
        owner: "evanbrierton",
        repo: "cambio",
        prId: "173",
        fetchImpl,
      }),
    ).resolves.toEqual({ draft: null, error: "HTTP 403" });
  });
});

describe("runIgnoreCheck", () => {
  it("skips when GitHub reports draft=true", async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ draft: true }),
    });
    const listChangedFilesImpl = vi.fn().mockReturnValue(["src/app/page.tsx"]);

    await expect(
      runIgnoreCheck(
        {
          VERCEL_ENV: "preview",
          VERCEL_GIT_PULL_REQUEST_ID: "173",
          VERCEL_GIT_REPO_OWNER: "evanbrierton",
          VERCEL_GIT_REPO_SLUG: "cambio",
          VERCEL_GIT_PREVIOUS_SHA: "abc123",
        },
        { fetchImpl, listChangedFilesImpl },
      ),
    ).resolves.toMatchObject({ exit: EXIT_SKIP });
  });

  it("skips when the diff is only tests/docs", async () => {
    const fetchImpl = vi.fn();
    const listChangedFilesImpl = vi
      .fn()
      .mockReturnValue(["src/game/engine.test.ts", "README.md"]);

    await expect(
      runIgnoreCheck(
        {
          VERCEL_ENV: "preview",
          VERCEL_GIT_PULL_REQUEST_ID: "192",
          VERCEL_GIT_REPO_OWNER: "evanbrierton",
          VERCEL_GIT_REPO_SLUG: "cambio",
          VERCEL_GIT_PREVIOUS_SHA: "abc123",
        },
        { fetchImpl, listChangedFilesImpl },
      ),
    ).resolves.toMatchObject({ exit: EXIT_SKIP });

    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("builds when the diff includes app code and the PR is ready", async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ draft: false }),
    });
    const listChangedFilesImpl = vi
      .fn()
      .mockReturnValue(["src/components/GameTable.tsx"]);

    await expect(
      runIgnoreCheck(
        {
          VERCEL_ENV: "preview",
          VERCEL_GIT_PULL_REQUEST_ID: "192",
          VERCEL_GIT_REPO_OWNER: "evanbrierton",
          VERCEL_GIT_REPO_SLUG: "cambio",
          VERCEL_GIT_PREVIOUS_SHA: "abc123",
        },
        { fetchImpl, listChangedFilesImpl },
      ),
    ).resolves.toMatchObject({ exit: EXIT_BUILD });
  });

  it("fails open when changed files cannot be determined", async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ draft: false }),
    });
    const listChangedFilesImpl = vi.fn().mockReturnValue(null);

    await expect(
      runIgnoreCheck(
        {
          VERCEL_ENV: "preview",
          VERCEL_GIT_PULL_REQUEST_ID: "192",
          VERCEL_GIT_REPO_OWNER: "evanbrierton",
          VERCEL_GIT_REPO_SLUG: "cambio",
        },
        { fetchImpl, listChangedFilesImpl },
      ),
    ).resolves.toMatchObject({ exit: EXIT_BUILD });
  });
});
