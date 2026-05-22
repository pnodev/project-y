import { FileDiff } from "@pierre/diffs/react";
import { parsePatchFiles } from "@pierre/diffs";
import type { DiffLineAnnotation } from "@pierre/diffs";
import { useEffect, useMemo, useRef, useState } from "react";
import { useTheme } from "next-themes";
import type { GitDiffFile, GitReviewComment } from "~/lib/git/types";
import {
  buildDiffLineIndex,
  commentToDiffAnnotation,
} from "~/lib/git/review-comment-annotation";
import { isReviewThreadRoot } from "~/lib/git/review-thread";
import {
  buildCommentCountByPath,
  DiffFileTree,
} from "~/components/git/DiffFileTree";
import { DiffInlineReviewComment } from "~/components/git/DiffInlineReviewComment";
import { ScrollArea } from "~/components/ui/scroll-area";
import { scrollDiffToLine } from "~/lib/git/scroll-diff-to-line";
import { cn } from "~/lib/utils";

function PatchDiff({ patch, path }: { patch: string; path: string }) {
  const unified = `diff --git a/${path} b/${path}\n${patch}`;
  const parsed = parsePatchFiles(unified);
  const fileDiff = parsed[0]?.files[0];
  if (!fileDiff) {
    return <pre className="overflow-auto p-2 text-xs">{patch}</pre>;
  }
  return <FileDiff fileDiff={fileDiff} options={diffDisplayOptions} />;
}

const diffDisplayOptions = {
  theme: {
    dark: "pierre-dark" as const,
    light: "pierre-light" as const,
  },
  themeType: "system" as const,
  diffStyle: "unified" as const,
};

function commentsForFile(
  comments: GitReviewComment[],
  path: string
): GitReviewComment[] {
  return comments.filter((c) => c.path === path);
}

function annotationsForFile(
  comments: GitReviewComment[],
  path: string,
  lineIndex?: ReturnType<typeof buildDiffLineIndex>
): DiffLineAnnotation<GitReviewComment>[] {
  return commentsForFile(comments, path)
    .map((c) => commentToDiffAnnotation(c, lineIndex))
    .filter((a): a is DiffLineAnnotation<GitReviewComment> => a != null);
}

type PierreDiffLineClick = {
  type: "diff-line";
  lineNumber: number;
  annotationSide: "deletions" | "additions";
  lineElement: HTMLElement;
};

export type DiffLineClickInfo = {
  path: string;
  line: number;
  side: "LEFT" | "RIGHT";
  anchorRect: DOMRect | null;
  lineElement: HTMLElement | null;
};

export function DiffViewer({
  files,
  className,
  comments = [],
  pendingCommentIds,
  readOnly = false,
  fillHeight = true,
  interactionDisabled = false,
  onLineClick,
  selectedLine,
  canResolveThreads = false,
  onToggleThreadResolved,
  resolvingThreadNodeId = null,
}: {
  files: GitDiffFile[];
  className?: string;
  comments?: GitReviewComment[];
  pendingCommentIds?: Set<number>;
  readOnly?: boolean;
  fillHeight?: boolean;
  interactionDisabled?: boolean;
  onLineClick?: (info: DiffLineClickInfo) => void;
  selectedLine?: {
    path: string;
    line: number;
    side?: "LEFT" | "RIGHT";
  } | null;
  canResolveThreads?: boolean;
  onToggleThreadResolved?: (
    threadNodeId: string,
    resolved: boolean
  ) => void | Promise<void>;
  resolvingThreadNodeId?: string | null;
}) {
  const { resolvedTheme } = useTheme();
  const diffScrollRef = useRef<HTMLDivElement>(null);
  const withPatch = files.filter((f) => f.patch);
  const [activePath, setActivePath] = useState<string | null>(
    () => withPatch[0]?.path ?? null
  );
  const active =
    withPatch.find((f) => f.path === activePath) ?? withPatch[0];
  const commentCountByPath = useMemo(
    () => buildCommentCountByPath(comments),
    [comments]
  );

  useEffect(() => {
    if (withPatch.length === 0) {
      setActivePath(null);
      return;
    }
    if (!activePath || !withPatch.some((f) => f.path === activePath)) {
      setActivePath(withPatch[0]!.path);
    }
  }, [withPatch, activePath]);

  useEffect(() => {
    if (selectedLine?.path) {
      setActivePath(selectedLine.path);
    }
  }, [selectedLine?.path]);

  const lineClickDisabled = readOnly || interactionDisabled;

  const pierreOptions = useMemo(
    () => ({
      ...diffDisplayOptions,
      themeType:
        resolvedTheme === "dark"
          ? ("dark" as const)
          : resolvedTheme === "light"
            ? ("light" as const)
            : ("system" as const),
      lineHoverHighlight: lineClickDisabled
        ? ("disabled" as const)
        : ("line" as const),
      onLineClick: lineClickDisabled
        ? undefined
        : (props: PierreDiffLineClick & { type?: string }) => {
            if (!active || !onLineClick) return;
            if (props.type != null && props.type !== "diff-line") return;
            const side =
              props.annotationSide === "deletions" ? "LEFT" : "RIGHT";
            const lineElement = props.lineElement ?? null;
            const anchorRect = lineElement?.getBoundingClientRect() ?? null;
            onLineClick({
              path: active.path,
              line: props.lineNumber,
              side,
              anchorRect,
              lineElement,
            });
          },
    }),
    [active, lineClickDisabled, onLineClick, resolvedTheme]
  );

  const parsed = useMemo(() => {
    if (!active?.patch) return null;
    return parsePatchFiles(
      `diff --git a/${active.path} b/${active.path}\n${active.patch}`
    );
  }, [active?.path, active?.patch]);

  const fileDiff = parsed?.[0]?.files[0];

  useEffect(() => {
    if (!selectedLine || active?.path !== selectedLine.path || !fileDiff) {
      return;
    }
    const side = selectedLine.side ?? "RIGHT";
    const timer = window.setTimeout(() => {
      scrollDiffToLine(diffScrollRef.current, selectedLine.line, side);
    }, 200);
    return () => window.clearTimeout(timer);
  }, [selectedLine, active?.path, fileDiff]);

  const lineIndex = useMemo(
    () => (fileDiff ? buildDiffLineIndex(fileDiff) : undefined),
    [fileDiff]
  );

  const threadCommentCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const c of comments) {
      if (!c.threadNodeId) continue;
      counts.set(c.threadNodeId, (counts.get(c.threadNodeId) ?? 0) + 1);
    }
    return counts;
  }, [comments]);

  const fileAnnotations = active
    ? annotationsForFile(comments, active.path, lineIndex)
    : [];

  const unmatchedComments = active
    ? commentsForFile(comments, active.path).filter(
        (c) => !commentToDiffAnnotation(c, lineIndex)
      )
    : [];

  if (withPatch.length === 0) {
    return (
      <p className="text-muted-foreground p-4 text-sm">
        No diff available. Large files may omit patches on GitHub.
      </p>
    );
  }

  return (
    <div
      className={cn(
        "flex min-h-0 border-t",
        fillHeight
          ? "min-h-0 flex-1"
          : "max-h-[min(480px,60vh)] min-h-[min(320px,40vh)]",
        className
      )}
    >
      <div className="flex min-h-0 w-48 shrink-0 flex-col overflow-hidden border-r">
        <DiffFileTree
          files={withPatch}
          activePath={active?.path ?? null}
          onSelectPath={setActivePath}
          commentCountByPath={commentCountByPath}
        />
      </div>
      <div
        ref={diffScrollRef}
        className="relative flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden"
      >
        <ScrollArea className="min-h-0 flex-1">
          {fileDiff ? (
            <div
              className={cn(
                "min-h-0",
                resolvedTheme === "dark" && "dark"
              )}
            >
              <FileDiff
                fileDiff={fileDiff}
                options={pierreOptions}
                lineAnnotations={fileAnnotations}
                selectedLines={
                  selectedLine?.path === active?.path
                    ? {
                        start: selectedLine.line,
                        end: selectedLine.line,
                        side:
                          selectedLine.side === "LEFT"
                            ? ("deletions" as const)
                            : ("additions" as const),
                      }
                    : null
                }
                renderAnnotation={(annotation) => {
                  if (!annotation.metadata) return null;
                  const meta = annotation.metadata;
                  const threadNodeId = meta.threadNodeId;
                  const threadResolved = meta.threadIsResolved ?? false;
                  const isRoot = isReviewThreadRoot(meta, comments);

                  if (threadResolved && threadNodeId && !isRoot) {
                    return null;
                  }

                  const showResolve =
                    canResolveThreads &&
                    !pendingCommentIds?.has(meta.id) &&
                    Boolean(threadNodeId) &&
                    isRoot;

                  return (
                    <DiffInlineReviewComment
                      comment={meta}
                      pending={pendingCommentIds?.has(meta.id)}
                      showResolve={showResolve}
                      threadCommentCount={
                        threadNodeId
                          ? (threadCommentCounts.get(threadNodeId) ?? 1)
                          : 1
                      }
                      resolveLoading={resolvingThreadNodeId === threadNodeId}
                      onToggleResolved={
                        threadNodeId && onToggleThreadResolved
                          ? () =>
                              void onToggleThreadResolved(
                                threadNodeId,
                                !threadResolved
                              )
                          : undefined
                      }
                    />
                  );
                }}
              />
            </div>
          ) : active?.patch ? (
            <div className="p-2 text-sm">
              <PatchDiff patch={active.patch} path={active.path} />
            </div>
          ) : null}
        </ScrollArea>
        {unmatchedComments.length > 0 ? (
          <div className="space-y-2.5 border-t border-border/60 bg-muted/20 p-3">
            <p className="text-muted-foreground text-xs font-medium">
              Comments on this file
            </p>
            {unmatchedComments.map((c) => {
              const threadNodeId = c.threadNodeId;
              const threadResolved = c.threadIsResolved ?? false;
              const isRoot = isReviewThreadRoot(c, comments);
              const showResolve =
                canResolveThreads &&
                !pendingCommentIds?.has(c.id) &&
                Boolean(threadNodeId) &&
                isRoot;

              return (
                <DiffInlineReviewComment
                  key={c.id}
                  comment={c}
                  pending={pendingCommentIds?.has(c.id)}
                  showResolve={showResolve}
                  threadCommentCount={
                    threadNodeId
                      ? (threadCommentCounts.get(threadNodeId) ?? 1)
                      : 1
                  }
                  resolveLoading={resolvingThreadNodeId === threadNodeId}
                  onToggleResolved={
                    threadNodeId && onToggleThreadResolved
                      ? () =>
                          void onToggleThreadResolved(
                            threadNodeId,
                            !threadResolved
                          )
                      : undefined
                  }
                />
              );
            })}
          </div>
        ) : null}
      </div>
    </div>
  );
}
