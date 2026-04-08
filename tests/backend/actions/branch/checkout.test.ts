import * as cp from "node:child_process";
import * as fs from "node:fs";
import * as path from "node:path";

import simpleGit from "simple-git";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { checkoutBranch } from "@/backend/actions/branch";

import { git, makeRepo } from "../../helpers";

let repo: string;
let remoteRepo: string;

function currentBranch(cwd: string): string {
  return cp.execFileSync("git", ["branch", "--show-current"], { cwd }).toString().trim();
}

beforeAll(() => {
  repo = makeRepo();
  git(["branch", "other"], repo);

  remoteRepo = makeRepo();
  git(["remote", "add", "origin", remoteRepo], repo);
  git(["fetch", "origin"], repo);
});

afterAll(() => {
  fs.rmSync(repo, { recursive: true, force: true });
  fs.rmSync(remoteRepo, { recursive: true, force: true });
});

describe("checkoutBranch", () => {
  it("checks out an existing local branch", async () => {
    await checkoutBranch(simpleGit(repo), {
      branchName: "other",
      remoteBranch: null
    });
    expect(currentBranch(repo)).toBe("other");
  });

  it("checks back out to main", async () => {
    await checkoutBranch(simpleGit(repo), {
      branchName: "main",
      remoteBranch: null
    });
    expect(currentBranch(repo)).toBe("main");
  });

  it("creates and checks out a new branch from a start point", async () => {
    await checkoutBranch(simpleGit(repo), {
      branchName: "from-main",
      remoteBranch: "main"
    });
    expect(currentBranch(repo)).toBe("from-main");

    git(["checkout", "main"], repo);
    git(["branch", "-d", "from-main"], repo);
  });

  it("throws when checking out a nonexistent branch", async () => {
    await expect(
      checkoutBranch(simpleGit(repo), {
        branchName: "nonexistent",
        remoteBranch: null
      })
    ).rejects.toThrow();
  });

  it("switches to existing local branch when name conflict occurs", async () => {
    await checkoutBranch(simpleGit(repo), {
      branchName: "other",
      remoteBranch: "main"
    });
    expect(currentBranch(repo)).toBe("other");

    git(["checkout", "main"], repo);
  });

  it("switches to existing local branch and pulls when name conflicts with a remote branch", async () => {
    fs.writeFileSync(path.join(remoteRepo, "f"), "updated");
    git(["add", "."], remoteRepo);
    git(["commit", "-m", "remote commit"], remoteRepo);

    const commitBefore = cp
      .execFileSync("git", ["rev-parse", "HEAD"], { cwd: repo })
      .toString()
      .trim();

    await checkoutBranch(simpleGit(repo), {
      branchName: "main",
      remoteBranch: "origin/main"
    });
    expect(currentBranch(repo)).toBe("main");

    const commitAfter = cp
      .execFileSync("git", ["rev-parse", "HEAD"], { cwd: repo })
      .toString()
      .trim();
    expect(commitAfter).not.toBe(commitBefore);
  });
});
