import type { GitStatus, GitStatusEntry } from "@pierre/trees";
import type { GitDiffFile } from "~/lib/git/types";

export function diffFilesToTreePaths(files: GitDiffFile[]): string[] {
  return files.map((f) => f.path);
}

export function diffFilesToGitStatus(files: GitDiffFile[]): GitStatusEntry[] {
  return files.map((file) => ({
    path: file.path,
    status: diffFileStatusToGitStatus(file.status),
  }));
}

function diffFileStatusToGitStatus(
  status: GitDiffFile["status"]
): GitStatus {
  switch (status) {
    case "added":
      return "added";
    case "removed":
      return "deleted";
    case "modified":
      return "modified";
    case "renamed":
      return "renamed";
  }
}
