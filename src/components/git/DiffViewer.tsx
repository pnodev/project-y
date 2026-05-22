import { FileDiff } from "@pierre/diffs/react";
import { parsePatchFiles } from "@pierre/diffs";
import type { DiffLineAnnotation } from "@pierre/diffs";
import { useMemo, useState } from "react";
import { useTheme } from "next-themes";
import type { GitDiffFile, GitReviewComment } from "~/lib/git/types";
import {
  buildDiffLineIndex,
  commentToDiffAnnotation,
} from "~/lib/git/review-comment-annotation";
import { ReviewComment } from "~/components/git/ReviewComment";
import { ScrollArea } from "~/components/ui/scroll-area";
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
  fillHeight = false,
  interactionDisabled = false,
  onLineClick,
  selectedLine,
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
}) {
  const { resolvedTheme } = useTheme();
  const withPatch = files.filter((f) => f.patch);
  const [activeIndex, setActiveIndex] = useState(0);
  const active = withPatch[activeIndex];
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

  const lineIndex = useMemo(
    () => (fileDiff ? buildDiffLineIndex(fileDiff) : undefined),
    [fileDiff]
  );

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
      <ScrollArea className="w-48 shrink-0 border-r">
        <ul className="p-1">
          {withPatch.map((file, i) => (
            <li key={file.path}>
              <button
                type="button"
                className={cn(
                  "w-full truncate rounded px-2 py-1.5 text-left text-xs",
                  i === activeIndex
                    ? "bg-muted font-medium"
                    : "hover:bg-muted/60"
                )}
                onClick={() => setActiveIndex(i)}
              >
                {file.path}
                {commentsForFile(comments, file.path).length > 0 ? (
                  <span className="text-muted-foreground ml-1">
                    ({commentsForFile(comments, file.path).length})
                  </span>
                ) : null}
              </button>
            </li>
          ))}
        </ul>
      </ScrollArea>
      <div className="relative flex min-w-0 flex-1 flex-col">
        <ScrollArea className="min-h-0 flex-1">
          {fileDiff ? (
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
                return (
                  <ReviewComment
                    comment={annotation.metadata}
                    pending={pendingCommentIds?.has(annotation.metadata.id)}
                  />
                );
              }}
            />
          ) : active?.patch ? (
            <div className="p-2 text-sm">
              <PatchDiff patch={active.patch} path={active.path} />
            </div>
          ) : null}
        </ScrollArea>
        {unmatchedComments.length > 0 ? (
          <div className="space-y-2 border-t border-border/60 bg-muted/20 p-3">
            <p className="text-muted-foreground text-xs font-medium">
              Comments on this file
            </p>
            {unmatchedComments.map((c) => (
              <ReviewComment key={c.id} comment={c} />
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}
