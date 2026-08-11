import { describe, expect, it, vi } from "vitest";
import {
  decideIgnore,
  EXIT_BUILD,
  EXIT_SKIP,
  fetchPrDraft,
  runIgnoreCheck,
} from "./vercel-ignore.mjs";

describe("decideIgnore", () => {
  it("always builds production", () => {
    expect(
      decideIgnore({ vercelEnv: "production", prId: "12", draft: true }),
    ).toMatchObject({ exit: EXIT_BUILD });
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

    await expect(
      runIgnoreCheck(
        {
          VERCEL_ENV: "preview",
          VERCEL_GIT_PULL_REQUEST_ID: "173",
          VERCEL_GIT_REPO_OWNER: "evanbrierton",
          VERCEL_GIT_REPO_SLUG: "cambio",
        },
        { fetchImpl },
      ),
    ).resolves.toMatchObject({ exit: EXIT_SKIP });
  });
});
