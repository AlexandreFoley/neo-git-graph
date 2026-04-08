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
    const localBranches = await git.branchLocal();
    const branchAlreadyExists = localBranches.all.includes(input.branchName);
    if (branchAlreadyExists) {
      await git.checkout(input.branchName);
      const slashIndex = input.remoteBranch.indexOf("/");
      // Only pull when remoteBranch has the expected "remote/branch" format and
      // the existing local branch is actually tracking this remote branch.
      if (slashIndex !== -1) {
        const upstream = (
          await git.raw([
            "for-each-ref",
            "--format=%(upstream:short)",
            `refs/heads/${input.branchName}`
          ])
        ).trim();
        if (upstream === input.remoteBranch) {
          const remote = input.remoteBranch.slice(0, slashIndex);
          const remoteBranchName = input.remoteBranch.slice(slashIndex + 1);
          await git.pull(remote, remoteBranchName);
        }
      }
    } else {
      await git.checkoutBranch(input.branchName, input.remoteBranch);
    }
  }
}
