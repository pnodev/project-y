import { useEffect, useMemo, useState } from "react";
import { PhaseBanner } from "~/components/git/PhaseBanner";
import {
  CommitList,
  sortCommitsNewestFirst,
} from "~/components/git/CommitList";
import { DiffViewer } from "~/components/git/DiffViewer";
import { DiffReviewPanel } from "~/components/git/DiffReviewPanel";
import { DiffLoadingSkeleton } from "~/components/git/review/DiffLoadingSkeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import { PullRequestStateBadge } from "~/components/git/PullRequestStateBadge";
import {
  fetchTaskPullRequestDiff,
  useTaskBranchCommitsQuery,
  useTaskBranchDiffQuery,
  useTaskCommitDiffQuery,
  useTaskPullRequestCommitsQuery,
} from "~/db/queries/git";
import { useQuery } from "@tanstack/react-query";
import {
  canReviewInline,
  getActiveBranch,
  getLatestPr,
  getOpenPr,
  getTaskDevPhase,
  type TaskDevPhaseContext,
} from "~/lib/git/task-dev-phase";
import { useTaskGitReviewNav } from "~/lib/git/task-git-review-nav";
import { cn } from "~/lib/utils";

type WorkspaceTab = "pull_request" | "commits" | "branch";

export function TaskDevelopmentWorkspace({
  taskId,
  gitContext,
  isPanel,
  className,
}: {
  taskId: string;
  gitContext: TaskDevPhaseContext & {
    pullRequests: Array<{
      id: string;
      number: number;
      state: string;
      baseRef: string;
      headRef: string;
      url: string;
    }>;
  };
  isPanel: boolean;
  className?: string;
}) {
  const phase = getTaskDevPhase(gitContext);
  const branch = getActiveBranch(gitContext);
  const openPr = getOpenPr(gitContext);
  const latestPr = getLatestPr(gitContext);
  const reviewPr = openPr ?? latestPr;

  const [tab, setTab] = useState<WorkspaceTab>("commits");
  const [selectedSha, setSelectedSha] = useState<string | null>(null);
  const gitReviewNav = useTaskGitReviewNav();

  useEffect(() => {
    if (phase === "open_pr" || phase === "closed_pr") {
      setTab("pull_request");
    } else if (phase === "branch_only") {
      setTab("commits");
    }
    setSelectedSha(null);
  }, [phase, taskId]);

  useEffect(() => {
    if (gitReviewNav?.lineFocus) {
      setTab("pull_request");
    }
  }, [gitReviewNav?.lineFocus]);

  const showPrTab = Boolean(reviewPr);
  const showBranchTab = Boolean(branch);
  const showCommitsTab = Boolean(branch || reviewPr);
  const readOnlyReview = !canReviewInline(phase);

  const usePrCommitsList =
    tab === "commits" &&
    Boolean(reviewPr) &&
    (phase === "open_pr" || phase === "closed_pr");

  const branchCommitsQuery = useTaskBranchCommitsQuery(
    taskId,
    tab === "commits" && Boolean(branch) && !usePrCommitsList
  );
  const prCommitsQuery = useTaskPullRequestCommitsQuery(
    taskId,
    reviewPr?.id,
    usePrCommitsList
  );

  const commits = useMemo(() => {
    const raw = usePrCommitsList
      ? (prCommitsQuery.data?.commits ?? [])
      : (branchCommitsQuery.data?.commits ?? []);
    return sortCommitsNewestFirst(raw);
  }, [
    usePrCommitsList,
    prCommitsQuery.data?.commits,
    branchCommitsQuery.data?.commits,
  ]);

  const prDiffQuery = useQuery({
    queryKey: ["git", "diff", taskId, "pr", reviewPr?.id],
    queryFn: () =>
      fetchTaskPullRequestDiff({
        data: { taskId, pullRequestId: reviewPr!.id },
      }),
    enabled: tab === "pull_request" && Boolean(reviewPr),
    staleTime: 3 * 60_000,
  });

  const branchDiffQuery = useTaskBranchDiffQuery(
    taskId,
    tab === "branch" && Boolean(branch)
  );

  const commitDiffQuery = useTaskCommitDiffQuery(
    taskId,
    selectedSha ?? undefined,
    tab === "commits" && Boolean(selectedSha)
  );

  useEffect(() => {
    if (commits.length > 0 && !selectedSha && tab === "commits") {
      setSelectedSha(commits[0].sha);
    }
  }, [commits, selectedSha, tab]);

  if (phase === "no_repo" || phase === "not_started") {
    return <PhaseBanner phase={phase} />;
  }

  const scopeLabel =
    tab === "pull_request" && reviewPr
      ? `PR #${reviewPr.number} vs ${reviewPr.baseRef}`
      : tab === "branch" && branchDiffQuery.data
        ? `Branch ${branchDiffQuery.data.headRef} vs ${branchDiffQuery.data.baseRef}`
        : selectedSha
          ? `Commit ${selectedSha.slice(0, 7)}`
          : "Changes";

  return (
    <div
      className={cn(
        "flex min-h-0 flex-col border-t border-border/60",
        isPanel && "flex-1",
        className
      )}
    >
      {!isPanel ? <PhaseBanner phase={phase} /> : null}

      <Tabs
        value={tab}
        onValueChange={(v) => setTab(v as WorkspaceTab)}
        className="flex min-h-0 flex-1 flex-col gap-0"
      >
        <TabsList className="h-9 w-full justify-start rounded-none border-b border-border/60 bg-transparent px-4">
          {showPrTab ? (
            <TabsTrigger value="pull_request" className="text-xs">
              Pull request
              {openPr ? (
                <PullRequestStateBadge state={openPr.state} className="ml-1.5" />
              ) : null}
            </TabsTrigger>
          ) : null}
          {showCommitsTab ? (
            <TabsTrigger value="commits" className="text-xs">
              Commits
            </TabsTrigger>
          ) : null}
          {showBranchTab ? (
            <TabsTrigger value="branch" className="text-xs">
              Branch diff
            </TabsTrigger>
          ) : null}
        </TabsList>

        <div className="flex min-h-0 min-w-0 flex-1 flex-col">
            <TabsContent
              value="pull_request"
              className="mt-0 flex min-h-0 flex-1 flex-col overflow-hidden data-[state=inactive]:hidden"
            >
              {prDiffQuery.isLoading ? (
                <DiffLoadingSkeleton className="flex-1 border-t-0" />
              ) : prDiffQuery.data && reviewPr ? (
                <DiffReviewPanel
                  taskId={taskId}
                  pullRequestId={reviewPr.id}
                  scopeLabel={scopeLabel}
                  files={prDiffQuery.data.files}
                  headSha={prDiffQuery.data.headSha}
                  readOnly={readOnlyReview}
                  compactToolbar={isPanel}
                  className="flex-1"
                />
              ) : null}
            </TabsContent>

            <TabsContent
              value="commits"
              className="mt-0 flex min-h-0 flex-1 flex-col overflow-hidden data-[state=inactive]:hidden"
            >
              <div className="bg-muted/20 shrink-0 border-b border-border/60">
                <div className="text-muted-foreground border-b border-border/60 px-3 py-1.5 text-[10px] font-medium tracking-wide uppercase">
                  Commits
                </div>
                <CommitList
                  layout="strip"
                  commits={commits}
                  selectedSha={selectedSha}
                  onSelect={setSelectedSha}
                />
              </div>
              <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
                {commitDiffQuery.isLoading ? (
                  <p className="text-muted-foreground p-4 text-sm">Loading diff…</p>
                ) : commitDiffQuery.data ? (
                  <>
                    {!isPanel ? (
                      <p className="shrink-0 border-b border-border/60 px-4 py-2 text-sm font-medium">
                        {scopeLabel}
                      </p>
                    ) : null}
                    <DiffViewer
                      files={commitDiffQuery.data.files}
                      readOnly
                      className="min-h-0 flex-1 border-t-0"
                    />
                  </>
                ) : (
                  <p className="text-muted-foreground p-4 text-sm">
                    Select a commit to view its diff.
                  </p>
                )}
              </div>
            </TabsContent>

            <TabsContent
              value="branch"
              className="mt-0 flex min-h-0 flex-1 flex-col overflow-hidden data-[state=inactive]:hidden"
            >
              {branchDiffQuery.isLoading ? (
                <p className="text-muted-foreground p-4 text-sm">Loading diff…</p>
              ) : branchDiffQuery.data ? (
                <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
                  {!isPanel ? (
                    <p className="shrink-0 border-b border-border/60 px-4 py-2 text-sm font-medium">
                      {scopeLabel}
                    </p>
                  ) : null}
                  <DiffViewer
                    files={branchDiffQuery.data.files}
                    readOnly
                    className="min-h-0 flex-1 border-t-0"
                  />
                </div>
              ) : null}
            </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}
