import type { TaskDevPhase } from "~/lib/git/task-dev-phase";
import { cn } from "~/lib/utils";

const MESSAGES: Record<TaskDevPhase, string> = {
  no_repo: "Link a repository in project settings to start development.",
  not_started:
    "Start development to create a branch. Commits and diffs appear once you push.",
  branch_only:
    "Work on your branch below. Open a pull request to enable inline code review on GitHub.",
  open_pr: "Use the toolbar to start a review, comment on lines, and finish on GitHub.",
  closed_pr:
    "This pull request is closed. Browse commits and diffs for context (read-only).",
};

export function PhaseBanner({
  phase,
  className,
}: {
  phase: TaskDevPhase;
  className?: string;
}) {
  return (
    <p
      className={cn(
        "text-muted-foreground border-b border-border/60 bg-muted/20 px-4 py-2 text-xs leading-relaxed",
        className
      )}
    >
      {MESSAGES[phase]}
    </p>
  );
}
