import { useEffect, useState, type ReactNode } from "react";
import {
  ChevronDown,
  Copy,
  ExternalLink,
  GitPullRequest,
  Link2,
  Play,
  Unlink,
} from "lucide-react";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "~/components/ui/collapsible";
import { useTaskGitContextQuery } from "~/db/queries/git";
import {
  useCreateTaskPullRequestMutation,
  useDisconnectTaskGitBranchMutation,
  useLinkTaskPullRequestMutation,
  useStartTaskDevelopmentMutation,
} from "~/db/mutations/git";
import { MULTI_REPO_SELECTION_MESSAGE } from "~/lib/git/constants";
import { useGitTaskLiveSync } from "~/hooks/use-git-task-live-sync";
import { formatClientError } from "~/lib/git/errors";
import { PullRequestDescriptionPanel } from "~/components/git/PullRequestDescriptionPanel";
import { CopyableBranchRef } from "~/components/git/CopyableBranchRef";
import { TaskDevelopmentEmptyState } from "~/components/git/TaskDevelopmentEmptyState";
import { TaskDevelopmentWorkspace } from "~/components/git/TaskDevelopmentWorkspace";
import {
  getActiveBranch,
  getOpenPr,
  getTaskDevPhase,
} from "~/lib/git/task-dev-phase";
import { cn } from "~/lib/utils";
import { toast } from "sonner";

type StepState = "pending" | "active" | "done";

function PipelineStep({
  label,
  detail,
  state,
}: {
  label: string;
  detail: ReactNode;
  state: StepState;
}) {
  return (
    <div className="min-w-0 flex-1">
      <div className="flex items-center gap-1.5">
        <span
          className={cn(
            "size-2 shrink-0 rounded-full",
            state === "done" && "bg-primary",
            state === "active" && "bg-primary/60 ring-2 ring-primary/30",
            state === "pending" && "bg-muted-foreground/30"
          )}
        />
        <span className="text-muted-foreground text-xs font-medium">{label}</span>
      </div>
      <div className="mt-0.5 truncate pl-3.5 text-xs">{detail}</div>
    </div>
  );
}

export function TaskDevelopmentSection({
  taskId,
  taskName,
  projectId,
  layout = "inline",
}: {
  taskId: string;
  taskName: string;
  projectId: string;
  /** `panel` fills the development tab column; `inline` is the legacy card style. */
  layout?: "inline" | "panel";
}) {
  const isPanel = layout === "panel";
  const { data, isLoading } = useTaskGitContextQuery(taskId);
  useGitTaskLiveSync(taskId);
  const startDevelopment = useStartTaskDevelopmentMutation();
  const disconnectBranch = useDisconnectTaskGitBranchMutation();
  const createPr = useCreateTaskPullRequestMutation();
  const linkPr = useLinkTaskPullRequestMutation();
  const [prUrl, setPrUrl] = useState("");
  const [selectedRepositoryId, setSelectedRepositoryId] = useState("");
  const [busy, setBusy] = useState(false);
  const [startingDevelopment, setStartingDevelopment] = useState(false);
  const [advancedOpen, setAdvancedOpen] = useState(false);

  const projectRepos = data?.projectRepos ?? [];
  const branches = data?.branches ?? [];
  const pullRequests = data?.pullRequests ?? [];
  const branch = data
    ? getActiveBranch({ projectRepos, branches, pullRequests })
    : undefined;

  useEffect(() => {
    if (!data) return;
    if (branch) {
      setSelectedRepositoryId(branch.repositoryId);
      return;
    }
    if (projectRepos.length === 1) {
      setSelectedRepositoryId(projectRepos[0]!.repositoryId);
    }
  }, [data, branch?.repositoryId, branch?.id, projectRepos]);

  if (isLoading || !data) return null;

  const { taskKey, activity } = data;
  const phase = getTaskDevPhase({
    projectRepos,
    branches,
    pullRequests,
  });
  const pr = pullRequests[0];
  const openPr = getOpenPr({ projectRepos, branches, pullRequests });
  const displayPr = openPr ?? pr;
  const linkedRepo = branch?.repository;
  const multipleRepos = projectRepos.length > 1;
  const commitCount = activity.filter((a) => a.type === "commit").length;

  const copy = (text: string, label: string) => {
    void navigator.clipboard.writeText(text);
    toast.success(`${label} copied`);
  };

  const branchStep: StepState = branch ? "done" : "pending";
  const commitStep: StepState =
    commitCount > 0 ? "done" : branch ? "active" : "pending";
  const prStep: StepState = pr
    ? openPr
      ? "active"
      : "done"
    : branch
      ? "active"
      : "pending";
  const reviewStep: StepState = openPr ? "active" : pr ? "done" : "pending";

  const handleStartDevelopment = async () => {
    setStartingDevelopment(true);
    try {
      const result = await startDevelopment({
        taskId,
        repositoryId: selectedRepositoryId || undefined,
      });
      void navigator.clipboard.writeText(result.checkoutCommand);
      toast.success("Development started — checkout command copied");
    } catch (e) {
      const message = formatClientError(e, "Failed to start development");
      toast.error(
        message.includes(MULTI_REPO_SELECTION_MESSAGE)
          ? "Select a repository first"
          : message
      );
    } finally {
      setStartingDevelopment(false);
    }
  };

  const startDevelopmentActions = (
    <>
      {!branch && multipleRepos ? (
        <div className="w-full space-y-1.5">
          <Label htmlFor="task-dev-repo-empty" className="text-xs">
            Repository
          </Label>
          <Select
            value={selectedRepositoryId}
            onValueChange={setSelectedRepositoryId}
            disabled={startingDevelopment}
          >
            <SelectTrigger
              id="task-dev-repo-empty"
              className="h-8 w-full max-w-md"
            >
              <SelectValue placeholder="Select repository" />
            </SelectTrigger>
            <SelectContent>
              {projectRepos.map((link) => (
                <SelectItem key={link.repositoryId} value={link.repositoryId}>
                  {link.repository.fullName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      ) : null}
      <Button
        type="button"
        loading={startingDevelopment}
        disabled={
          startingDevelopment || busy || (multipleRepos && !selectedRepositoryId)
        }
        onClick={() => void handleStartDevelopment()}
      >
        {!startingDevelopment ? <Play className="size-3.5" /> : null}
        {startingDevelopment ? "Starting…" : "Start development"}
      </Button>
    </>
  );

  if (projectRepos.length === 0) {
    return (
      <TaskDevelopmentEmptyState
        phase="no_repo"
        projectId={projectId}
        layout={isPanel ? "panel" : "inline"}
      />
    );
  }

  if (isPanel && phase === "not_started") {
    return (
      <section className="flex h-full min-h-0 flex-col">
        <TaskDevelopmentEmptyState
          phase="not_started"
          projectId={projectId}
          layout="panel"
          starting={startingDevelopment}
          actions={startDevelopmentActions}
        />
        <Collapsible
          open={advancedOpen}
          onOpenChange={setAdvancedOpen}
          className="mt-auto border-t border-border/60"
        >
          <CollapsibleTrigger className="text-muted-foreground flex w-full items-center justify-between px-4 py-2 text-xs hover:bg-muted/40">
            Advanced
            <ChevronDown
              className={cn(
                "size-3.5 transition-transform",
                advancedOpen && "rotate-180"
              )}
            />
          </CollapsibleTrigger>
          <CollapsibleContent className="px-4 pb-3">
            <div className="flex gap-2">
              <Input
                placeholder="Paste PR URL"
                value={prUrl}
                onChange={(e) => setPrUrl(e.target.value)}
                className="h-8 text-sm"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={!prUrl || busy}
                onClick={async () => {
                  setBusy(true);
                  try {
                    await linkPr({ taskId, prUrl });
                    setPrUrl("");
                    toast.success("Pull request linked");
                  } catch (e) {
                    toast.error(
                      formatClientError(e, "Failed to link pull request")
                    );
                  } finally {
                    setBusy(false);
                  }
                }}
              >
                <Link2 className="size-3.5" />
                Link
              </Button>
            </div>
          </CollapsibleContent>
        </Collapsible>
      </section>
    );
  }

  return (
    <section
      className={cn(
        "flex min-h-0 flex-col",
        isPanel ? "h-full" : "rounded-lg border border-border/60 bg-muted/30"
      )}
    >
      {!isPanel ? (
        <>
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/60 px-4 py-3">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-sm font-medium">Development</h3>
              <Badge variant="secondary" className="font-mono text-xs">
                {taskKey}
              </Badge>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="size-7"
                aria-label="Copy task key"
                onClick={() => copy(taskKey, "Task key")}
              >
                <Copy className="size-3.5" />
              </Button>
            </div>
            {linkedRepo ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-7"
                asChild
              >
                <a href={linkedRepo.htmlUrl} target="_blank" rel="noreferrer">
                  {linkedRepo.fullName}
                  <ExternalLink className="size-3.5" />
                </a>
              </Button>
            ) : null}
          </div>

          <div className="flex gap-2 border-b border-border/60 px-4 py-3">
            <PipelineStep
              label="Branch"
              detail={
                branch ? (
                  multipleRepos ? (
                    <>
                      {branch.repository.fullName} ·{" "}
                      <CopyableBranchRef branchRef={branch.ref} onCopy={copy} />
                    </>
                  ) : (
                    <CopyableBranchRef branchRef={branch.ref} onCopy={copy} />
                  )
                ) : (
                  "Not started"
                )
              }
              state={branchStep}
            />
            <PipelineStep
              label="Commits"
              detail={
                commitCount > 0
                  ? `${commitCount} on branch`
                  : branch
                    ? "Push to branch"
                    : "—"
              }
              state={commitStep}
            />
            <PipelineStep
              label="Pull request"
              detail={
                pr ? `#${pr.number} ${pr.state}` : branch ? "Not opened" : "—"
              }
              state={prStep}
            />
            <PipelineStep
              label="Review"
              detail={openPr ? "Ready" : pr ? "Closed" : "—"}
              state={reviewStep}
            />
          </div>
        </>
      ) : isPanel && displayPr ? null : (
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/60 px-3 py-2">
          <p className="text-muted-foreground flex min-w-0 items-center truncate text-xs">
            {branch ? (
              <>
                {multipleRepos ? (
                  <>
                    <span className="truncate">{branch.repository.fullName}</span>
                    <span className="shrink-0"> · </span>
                  </>
                ) : null}
                <CopyableBranchRef branchRef={branch.ref} onCopy={copy} />
                {commitCount > 0 ? (
                  <span className="shrink-0">
                    {" "}
                    · {commitCount} commit{commitCount === 1 ? "" : "s"}
                  </span>
                ) : null}
                {pr && !displayPr ? (
                  <span className="shrink-0">
                    {" "}
                    · PR #{pr.number} {pr.state}
                  </span>
                ) : null}
              </>
            ) : (
              "No branch"
            )}
          </p>
          {linkedRepo ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 shrink-0 text-xs"
              asChild
            >
              <a href={linkedRepo.htmlUrl} target="_blank" rel="noreferrer">
                {linkedRepo.fullName}
                <ExternalLink className="size-3.5" />
              </a>
            </Button>
          ) : null}
        </div>
      )}

      {displayPr ? (
        <PullRequestDescriptionPanel
          taskId={taskId}
          pullRequestId={displayPr.id}
          repository={
            linkedRepo
              ? { fullName: linkedRepo.fullName, htmlUrl: linkedRepo.htmlUrl }
              : undefined
          }
          headerActions={
            branch ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-8"
                disabled={busy}
                onClick={async () => {
                  if (
                    !window.confirm(
                      `Disconnect ${branch.repository.fullName} from this task? Linked pull requests for this repo will be removed. The branch stays on GitHub.`
                    )
                  ) {
                    return;
                  }
                  setBusy(true);
                  try {
                    await disconnectBranch({ taskId, branchId: branch.id });
                    toast.success("Disconnected from repository");
                  } catch (e) {
                    toast.error(formatClientError(e, "Failed to disconnect"));
                  } finally {
                    setBusy(false);
                  }
                }}
              >
                <Unlink className="size-3.5" />
                Disconnect
              </Button>
            ) : null
          }
        />
      ) : null}

      {isPanel && displayPr ? null : (
      <div
        className={cn(
          "flex flex-col gap-3",
          isPanel ? "px-3 py-2" : "px-4 py-3"
        )}
      >
        {!branch && multipleRepos ? (
          <div className="space-y-1.5">
            <Label htmlFor="task-dev-repo" className="text-xs">
              Repository
            </Label>
            <Select
              value={selectedRepositoryId}
              onValueChange={setSelectedRepositoryId}
              disabled={startingDevelopment}
            >
              <SelectTrigger id="task-dev-repo" className="h-8 w-full max-w-md">
                <SelectValue placeholder="Select repository" />
              </SelectTrigger>
              <SelectContent>
                {projectRepos.map((link) => (
                  <SelectItem
                    key={link.repositoryId}
                    value={link.repositoryId}
                  >
                    {link.repository.fullName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        ) : null}

        <div className="flex flex-wrap items-center gap-2">
        {!branch ? (
          <Button
            type="button"
            loading={startingDevelopment}
            disabled={
              startingDevelopment ||
              busy ||
              (multipleRepos && !selectedRepositoryId)
            }
            onClick={() => void handleStartDevelopment()}
          >
            {!startingDevelopment ? <Play className="size-3.5" /> : null}
            {startingDevelopment ? "Starting…" : "Start development"}
          </Button>
        ) : !openPr && !pr ? (
          <>
            <Button
              type="button"
              variant="default"
              size="sm"
              disabled={busy}
              onClick={async () => {
                setBusy(true);
                try {
                  await createPr(taskId);
                  toast.success("Pull request created");
                } catch (e) {
                  toast.error(
                    formatClientError(e, "Failed to create pull request")
                  );
                } finally {
                  setBusy(false);
                }
              }}
            >
              <GitPullRequest className="size-3.5" />
              Create pull request
            </Button>
            {branch.repository && (
              <Button type="button" variant="outline" size="sm" asChild>
                <a
                  href={`${branch.repository.htmlUrl}/tree/${branch.ref}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  Open branch on GitHub
                  <ExternalLink className="size-3.5" />
                </a>
              </Button>
            )}
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={busy}
              onClick={async () => {
                if (
                  !window.confirm(
                    `Disconnect ${branch.ref} on ${branch.repository.fullName} from this task? The branch will remain on GitHub.`
                  )
                ) {
                  return;
                }
                setBusy(true);
                try {
                  await disconnectBranch({ taskId, branchId: branch.id });
                  toast.success("Branch disconnected from task");
                } catch (e) {
                  toast.error(
                    formatClientError(e, "Failed to disconnect branch")
                  );
                } finally {
                  setBusy(false);
                }
              }}
            >
              <Unlink className="size-3.5" />
              Disconnect
            </Button>
          </>
        ) : pr && branch && !displayPr ? (
          <>
            <Button type="button" variant="outline" size="sm" asChild>
              <a href={pr.url} target="_blank" rel="noreferrer">
                Open on GitHub
                <ExternalLink className="size-3.5" />
              </a>
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={busy}
              onClick={async () => {
                if (
                  !window.confirm(
                    `Disconnect ${branch.repository.fullName} from this task? Linked pull requests for this repo will be removed. The branch stays on GitHub.`
                  )
                ) {
                  return;
                }
                setBusy(true);
                try {
                  await disconnectBranch({ taskId, branchId: branch.id });
                  toast.success("Disconnected from repository");
                } catch (e) {
                  toast.error(formatClientError(e, "Failed to disconnect"));
                } finally {
                  setBusy(false);
                }
              }}
            >
              <Unlink className="size-3.5" />
              Disconnect
            </Button>
          </>
        ) : null}
        </div>
      </div>
      )}

      {phase !== "no_repo" && phase !== "not_started" ? (
        <TaskDevelopmentWorkspace
          taskId={taskId}
          gitContext={{ projectRepos, branches, pullRequests }}
          isPanel={isPanel}
          className={isPanel ? "min-h-0 flex-1" : undefined}
        />
      ) : null}

      <Collapsible
        open={advancedOpen}
        onOpenChange={setAdvancedOpen}
        className="border-t border-border/60"
      >
        <CollapsibleTrigger className="text-muted-foreground flex w-full items-center justify-between px-4 py-2 text-xs hover:bg-muted/40">
          Advanced
          <ChevronDown
            className={cn(
              "size-3.5 transition-transform",
              advancedOpen && "rotate-180"
            )}
          />
        </CollapsibleTrigger>
        <CollapsibleContent className="px-4 pb-3">
          <div className="flex gap-2">
            <Input
              placeholder="Paste PR URL"
              value={prUrl}
              onChange={(e) => setPrUrl(e.target.value)}
              className="h-8 text-sm"
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={!prUrl || busy}
              onClick={async () => {
                setBusy(true);
                try {
                  await linkPr({ taskId, prUrl });
                  setPrUrl("");
                  toast.success("Pull request linked");
                } catch (e) {
                  toast.error(
                    formatClientError(e, "Failed to link pull request")
                  );
                } finally {
                  setBusy(false);
                }
              }}
            >
              <Link2 className="size-3.5" />
              Link
            </Button>
          </div>
        </CollapsibleContent>
      </Collapsible>
    </section>
  );
}
