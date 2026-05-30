import { Link } from "@tanstack/react-router";
import {
  Check,
  GitBranch,
  Github,
  GitPullRequest,
  Link2,
  MessageSquare,
} from "lucide-react";
import { GitProviderIcon } from "~/components/git/GitProviderIcon";
import { Button } from "~/components/ui/button";
import { useGitConnectionQuery } from "~/db/queries/git";
import { projectEditSheetSearch } from "~/lib/form-sheet-search";
import type { TaskDevPhase } from "~/lib/git/task-dev-phase";
import { cn } from "~/lib/utils";

type SetupStep = {
  title: string;
  description: string;
  state: "done" | "active" | "pending";
};

function SetupStepRow({
  step,
  stepNumber,
}: {
  step: SetupStep;
  stepNumber: number;
}) {
  return (
    <li className="flex gap-3">
      <div
        className={cn(
          "flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-medium",
          step.state === "done" && "bg-primary text-primary-foreground",
          step.state === "active" &&
            "bg-primary/15 text-primary ring-2 ring-primary/25",
          step.state === "pending" && "bg-muted text-muted-foreground"
        )}
      >
        {step.state === "done" ? (
          <Check className="size-3.5" aria-hidden />
        ) : (
          stepNumber
        )}
      </div>
      <div className="min-w-0 pt-0.5">
        <p
          className={cn(
            "text-sm font-medium",
            step.state === "pending" && "text-muted-foreground"
          )}
        >
          {step.title}
        </p>
        <p className="text-muted-foreground mt-0.5 text-xs leading-relaxed">
          {step.description}
        </p>
      </div>
    </li>
  );
}

export function TaskDevelopmentEmptyState({
  phase,
  projectId,
  layout = "panel",
  actions,
  starting = false,
}: {
  phase: Extract<TaskDevPhase, "no_repo" | "not_started">;
  projectId: string;
  layout?: "panel" | "inline";
  actions?: React.ReactNode;
  starting?: boolean;
}) {
  const { data: connectionData } = useGitConnectionQuery();
  const provider = connectionData?.connection?.provider ?? null;
  /** Integrations UI and connection query are GitHub-only today. */
  const isGitHubConnected = provider === "github";
  const isPanel = layout === "panel";

  const steps: SetupStep[] =
    phase === "no_repo"
      ? [
          {
            title: "Connect GitHub",
            description:
              "Install the app and sync repositories from your organization.",
            state: isGitHubConnected ? "done" : "active",
          },
          {
            title: "Link repositories to this project",
            description:
              "Choose which repos this project uses for branches and pull requests.",
            state: isGitHubConnected ? "active" : "pending",
          },
          {
            title: "Start development on this task",
            description:
              "Creates a branch, copies checkout commands, and tracks commits here.",
            state: "pending",
          },
        ]
      : [
          {
            title: "Connect GitHub",
            description: "Your organization is connected.",
            state: "done",
          },
          {
            title: "Link repositories to this project",
            description: "Repositories are linked and ready to use.",
            state: "done",
          },
          {
            title: "Start development on this task",
            description: starting
              ? "Creating branch on GitHub…"
              : "Creates a branch from the task key. Commits and diffs appear once you push.",
            state: "active",
          },
        ];

  const title =
    phase === "no_repo"
      ? "Set up development"
      : starting
        ? "Creating branch…"
        : "Ready to start development";
  const description =
    phase === "no_repo"
      ? "Connect your repository to track branches, commits, pull requests, and code review — without leaving this task."
      : starting
        ? "Setting up your branch on GitHub. This may take a few seconds."
        : "Your project is configured. Start development to create a branch and begin tracking work on this task.";

  return (
    <section
      aria-busy={starting || undefined}
      className={cn(
        isPanel
          ? "flex h-full min-h-0 flex-col items-center justify-center px-6 py-8"
          : "rounded-lg border border-border/60 bg-muted/30 px-4 py-4"
      )}
    >
      <div className={cn("w-full space-y-5", isPanel ? "max-w-md" : undefined)}>
        <div className={cn(isPanel && "text-center")}>
          {isPanel ? (
            <div className="mx-auto mb-3 flex size-11 items-center justify-center rounded-xl bg-muted">
              {isGitHubConnected ? (
                <GitProviderIcon provider="github" className="text-muted-foreground" />
              ) : (
                <GitBranch className="text-muted-foreground size-5" aria-hidden />
              )}
            </div>
          ) : (
            <h3 className="text-sm font-medium">Development</h3>
          )}
          <h4
            className={cn(
              "font-medium",
              isPanel ? "text-base" : "mt-2 text-sm"
            )}
          >
            {title}
          </h4>
          <p className="text-muted-foreground mt-1.5 text-sm leading-relaxed">
            {description}
          </p>
        </div>

        <ol className="space-y-3">
          {steps.map((step, index) => (
            <SetupStepRow
              key={index}
              step={step}
              stepNumber={index + 1}
            />
          ))}
        </ol>

        <div
          className={cn(
            phase === "not_started"
              ? "flex w-full flex-col items-stretch gap-3 pt-1"
              : "flex flex-wrap gap-2",
            isPanel && phase === "no_repo" && "justify-center pt-1"
          )}
        >
          {phase === "no_repo" ? (
            <>
              {!isGitHubConnected ? (
                <Button asChild>
                  <Link to="/settings/integrations">
                    <Github className="size-4" />
                    Connect GitHub
                  </Link>
                </Button>
              ) : (
                <Button asChild>
                  <Link {...projectEditSheetSearch(projectId)}>
                    <Link2 className="size-4" />
                    Link repositories
                  </Link>
                </Button>
              )}
              {isGitHubConnected ? (
                <Button variant="outline" asChild>
                  <Link to="/settings/integrations">
                    <Github className="size-4" />
                    Manage integration
                  </Link>
                </Button>
              ) : null}
            </>
          ) : (
            actions
          )}
        </div>
      </div>
    </section>
  );
}

export function TaskPullRequestReviewEmptyState({
  variant,
}: {
  variant: "no_setup" | "no_pr";
}) {
  if (variant === "no_setup") {
    return (
      <div className="rounded-lg border border-dashed border-border/60 bg-muted/20 px-3 py-4">
        <MessageSquare className="text-muted-foreground mb-2 size-4" />
        <p className="text-sm font-medium">Reviews appear after setup</p>
        <p className="text-muted-foreground mt-1 text-xs leading-relaxed">
          Once GitHub is connected and a pull request is opened for this task,
          review comments and feedback from GitHub will show up here.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-dashed border-border/60 bg-muted/20 px-3 py-4">
      <GitPullRequest className="text-muted-foreground mb-2 size-4" />
      <p className="text-sm font-medium">No pull request yet</p>
      <p className="text-muted-foreground mt-1 text-xs leading-relaxed">
        Open or link a pull request from the development panel. Inline review
        comments, approvals, and bot feedback from GitHub will appear here.
      </p>
    </div>
  );
}
