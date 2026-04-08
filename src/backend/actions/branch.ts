import type { SimpleGit } from "simple-git";

import type { ActionPayload } from "@/backend/types";

export async function createBranch(
  git: SimpleGit,
  input: ActionPayload<"createBranch">
): Promise<void> {
  await git.raw(["branch", input.branchName, input.commitHash]);
}

export async function deleteBranch(
  git: SimpleGit,
  input: ActionPayload<"deleteBranch">
): Promise<void> {
  await git.deleteLocalBranch(input.branchName, input.forceDelete);
}

export async function renameBranch(
  git: SimpleGit,
  input: ActionPayload<"renameBranch">
): Promise<void> {
  await git.raw(["branch", "-m", input.oldName, input.newName]);
}

export async function checkoutBranch(
  git: SimpleGit,
  input: ActionPayload<"checkoutBranch">
): Promise<void> {
  if (input.remoteBranch === null) {
    await git.checkout(input.branchName);
  } else {
    try {
      await git.checkoutBranch(input.branchName, input.remoteBranch);
    } catch (e) {
      if (!(e instanceof Error) || !e.message.includes("already exists")) {
        throw e;
      }
      await git.checkout(input.branchName);
      const slashIndex = input.remoteBranch.indexOf("/");
      // Only pull when remoteBranch has the expected "remote/branch" format.
      // From the UI, remoteBranch is always a remote-tracking ref (e.g. "origin/main"),
      // so this guard handles any unexpected non-remote start points gracefully.
      if (slashIndex !== -1) {
        const remote = input.remoteBranch.slice(0, slashIndex);
        const remoteBranchName = input.remoteBranch.slice(slashIndex + 1);
        await git.pull(remote, remoteBranchName);
      }
    }
  }
}
