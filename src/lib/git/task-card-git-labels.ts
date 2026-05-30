import type { TaskGitSummary } from "~/db/queries/git";

export function taskKeyTooltipLabel(): string {
  return "Git task key — used in branch names and commits";
}

export function taskBranchTooltipLabel(): string {
  return "Linked development branch";
}

const prStateLabels: Record<string, string> = {
  open: "Open pull request",
  draft: "Draft pull request",
  closed: "Closed pull request",
  merged: "Merged pull request",
};

export function taskPullRequestTooltipLabel(summary: TaskGitSummary): string {
  if (summary.prState) {
    return prStateLabels[summary.prState] ?? "Linked pull request";
  }
  return "Linked pull request";
}
