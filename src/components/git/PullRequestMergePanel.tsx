import { useEffect, useState } from "react";
import {
  Check,
  ChevronDown,
  Circle,
  ExternalLink,
  GitMerge,
  Loader2,
  Minus,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "~/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "~/components/ui/collapsible";
import { LoadingSpinner } from "~/components/ui/loading-spinner";
import {
  useCloseTaskPullRequestMutation,
  useMergeTaskPullRequestMutation,
} from "~/db/mutations/git";
import { useTaskPullRequestMergeStatusQuery } from "~/db/queries/git";
import { formatClientError } from "~/lib/git/errors";
import { resolveCheckAvatarUrl } from "~/lib/git/check-avatar";
import {
  canMergePullRequest,
  checksSummaryLabel,
  groupPullRequestChecks,
  mergeabilityMessage,
} from "~/lib/git/pr-check-summary";
import type { GitPullRequestCheck } from "~/lib/git/types";
import { cn } from "~/lib/utils";

function CheckAppAvatar({
  check,
  className,
}: {
  check: GitPullRequestCheck;
  className?: string;
}) {
  const src = resolveCheckAvatarUrl(check);
  if (!src) return null;

  return (
    <img
      src={src}
      alt=""
      className={cn(
        "size-4 shrink-0 rounded-sm border border-border/40 bg-background object-cover",
        className
      )}
    />
  );
}

function CheckStatusIcon({
  check,
  className,
}: {
  check: GitPullRequestCheck;
  className?: string;
}) {
  if (check.status !== "completed") {
    return (
      <Loader2
        className={cn("size-4 shrink-0 animate-spin text-muted-foreground", className)}
      />
    );
  }
  if (
    check.conclusion === "failure" ||
    check.conclusion === "timed_out" ||
    check.conclusion === "action_required"
  ) {
    return <X className={cn("size-4 shrink-0 text-destructive", className)} />;
  }
  if (check.conclusion === "neutral") {
    return <Minus className={cn("size-4 shrink-0 text-muted-foreground", className)} />;
  }
  return <Check className={cn("size-4 shrink-0 text-emerald-500", className)} />;
}

function CheckRow({ check }: { check: GitPullRequestCheck }) {
  return (
    <li className="flex items-start gap-2 py-1.5">
      <CheckStatusIcon check={check} className="mt-0.5" />
      <CheckAppAvatar check={check} className="mt-0.5" />
      <div className="min-w-0 flex-1">
        <a
          href={check.htmlUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-foreground hover:text-primary text-xs font-medium underline-offset-2 hover:underline"
        >
          {check.name}
        </a>
        {check.description ? (
          <p className="text-muted-foreground mt-0.5 line-clamp-2 text-[11px] leading-snug">
            {check.description}
          </p>
        ) : null}
      </div>
      <a
        href={check.htmlUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="text-muted-foreground hover:text-foreground shrink-0 p-0.5"
        aria-label="Open check on GitHub"
      >
        <ExternalLink className="size-3.5" />
      </a>
    </li>
  );
}

function CheckGroup({
  label,
  checks,
  defaultOpen = true,
}: {
  label: string;
  checks: GitPullRequestCheck[];
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  if (checks.length === 0) return null;

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger className="flex w-full cursor-pointer items-center gap-1.5 py-1 text-left">
        <ChevronDown
          className={cn(
            "text-muted-foreground size-3.5 shrink-0 transition-transform",
            open && "rotate-180"
          )}
        />
        <span className="text-muted-foreground text-[11px] font-medium">
          {label}
        </span>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <ul className="border-border/60 ml-1 border-l pl-3">
          {checks.map((check) => (
            <CheckRow key={check.id} check={check} />
          ))}
        </ul>
      </CollapsibleContent>
    </Collapsible>
  );
}

export function PullRequestMergePanel({
  taskId,
  pullRequestId,
  prNumber,
  prUrl,
  prState,
  canAct = true,
}: {
  taskId: string;
  pullRequestId: string;
  prNumber: number;
  prUrl: string;
  prState: string;
  /** Requires linked GitHub user OAuth for merge/close. */
  canAct?: boolean;
}) {
  const [deferReady, setDeferReady] = useState(false);

  useEffect(() => {
    setDeferReady(false);
    const timer = window.setTimeout(() => setDeferReady(true), 300);
    return () => window.clearTimeout(timer);
  }, [taskId, pullRequestId]);

  const { data: status, isLoading, isFetching, refetch } =
    useTaskPullRequestMergeStatusQuery(taskId, pullRequestId, deferReady);
  const mergePr = useMergeTaskPullRequestMutation();
  const closePr = useCloseTaskPullRequestMutation();
  const [checksOpen, setChecksOpen] = useState(true);
  const [busy, setBusy] = useState<"merge" | "close" | null>(null);

  const liveState = status?.state ?? prState;
  const isOpen = liveState === "open" || liveState === "draft";

  if (!isOpen) {
    const label =
      liveState === "merged"
        ? "Pull request merged"
        : "Pull request closed";
    return (
      <div className="border-border/60 shrink-0 border-t px-4 py-3">
        <p className="text-muted-foreground text-xs">{label}</p>
        <a
          href={prUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-primary mt-1 inline-flex items-center gap-1 text-xs hover:underline"
        >
          View PR #{prNumber} on GitHub
          <ExternalLink className="size-3" />
        </a>
      </div>
    );
  }

  const checkGroup = groupPullRequestChecks(status?.checks ?? []);
  const summary = checksSummaryLabel(checkGroup);
  const mergeability = mergeabilityMessage({
    mergeable: status?.mergeable ?? null,
    mergeableState: status?.mergeableState ?? "unknown",
  });
  const mergeAllowed = status
    ? canMergePullRequest({
        state: status.state,
        mergeable: status.mergeable,
        mergeableState: status.mergeableState,
        checkGroup,
      })
    : false;

  const handleMerge = async () => {
    setBusy("merge");
    try {
      await mergePr({ taskId, pullRequestId });
      toast.success("Pull request merged");
      await refetch();
    } catch (e) {
      toast.error(formatClientError(e, "Failed to merge pull request"));
    } finally {
      setBusy(null);
    }
  };

  const handleClose = async () => {
    setBusy("close");
    try {
      await closePr({ taskId, pullRequestId });
      toast.success("Pull request closed");
      await refetch();
    } catch (e) {
      toast.error(formatClientError(e, "Failed to close pull request"));
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="border-border/60 shrink-0 border-t">
      <div className="px-4 py-3">
        {!deferReady || isLoading ? (
          <p className="text-muted-foreground text-xs">Loading checks…</p>
        ) : (
          <div className="space-y-3">
            <Collapsible open={checksOpen} onOpenChange={setChecksOpen}>
              <div
                className={cn(
                  "rounded-md border px-3 py-2.5",
                  summary.tone === "success" &&
                    "border-emerald-500/40 bg-emerald-500/5",
                  summary.tone === "failure" &&
                    "border-destructive/40 bg-destructive/5",
                  summary.tone === "pending" &&
                    "border-border/80 bg-muted/20",
                  summary.tone === "none" && "border-border/60 bg-muted/10"
                )}
              >
                <CollapsibleTrigger
                  className={cn(
                    "flex w-full items-start gap-2 text-left",
                    (status?.checks.length ?? 0) > 0 && "cursor-pointer"
                  )}
                >
                  {summary.tone === "success" ? (
                    <Check className="mt-0.5 size-4 shrink-0 text-emerald-500" />
                  ) : summary.tone === "failure" ? (
                    <X className="text-destructive mt-0.5 size-4 shrink-0" />
                  ) : summary.tone === "pending" ? (
                    <Loader2 className="text-muted-foreground mt-0.5 size-4 shrink-0 animate-spin" />
                  ) : (
                    <Circle className="text-muted-foreground mt-0.5 size-4 shrink-0" />
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold">{summary.headline}</p>
                    {summary.detail ? (
                      <p className="text-muted-foreground mt-0.5 text-[11px]">
                        {summary.detail}
                      </p>
                    ) : null}
                  </div>
                  {(status?.checks.length ?? 0) > 0 ? (
                    <ChevronDown
                      className={cn(
                        "text-muted-foreground size-4 shrink-0 transition-transform",
                        checksOpen && "rotate-180"
                      )}
                    />
                  ) : null}
                </CollapsibleTrigger>
                <CollapsibleContent className="mt-2">
                  <CheckGroup
                    label={`${checkGroup.inProgress.length} in progress`}
                    checks={checkGroup.inProgress}
                  />
                  <CheckGroup
                    label={`${checkGroup.neutral.length} neutral checks`}
                    checks={checkGroup.neutral}
                  />
                  <CheckGroup
                    label={`${checkGroup.successful.length} successful checks`}
                    checks={checkGroup.successful}
                  />
                  <CheckGroup
                    label={`${checkGroup.failed.length} failed checks`}
                    checks={checkGroup.failed}
                    defaultOpen
                  />
                </CollapsibleContent>
              </div>
            </Collapsible>

            <div className="flex items-start gap-2">
              {mergeability.ok ? (
                <Check className="mt-0.5 size-4 shrink-0 text-emerald-500" />
              ) : (
                <X className="text-destructive mt-0.5 size-4 shrink-0" />
              )}
              <div>
                <p className="text-xs font-medium">{mergeability.title}</p>
                <p className="text-muted-foreground mt-0.5 text-[11px] leading-snug">
                  {mergeability.detail}
                </p>
              </div>
            </div>

            {canAct ? (
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  size="sm"
                  className="border-emerald-600 bg-emerald-600 text-white hover:border-emerald-700 hover:bg-emerald-700"
                  disabled={!mergeAllowed || busy !== null}
                  loading={busy === "merge"}
                  icon={GitMerge}
                  onClick={() => void handleMerge()}
                >
                  Merge pull request
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={busy !== null}
                  loading={busy === "close"}
                  onClick={() => void handleClose()}
                >
                  Close without merging
                </Button>
                {isFetching && !isLoading ? (
                  <LoadingSpinner isActive className="size-3.5" />
                ) : null}
              </div>
            ) : (
              <p className="text-muted-foreground text-[11px]">
                Connect GitHub in settings to merge or close this pull request
                here.
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
