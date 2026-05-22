import { FileTree, useFileTree } from "@pierre/trees/react";
import { themeToTreeStyles } from "@pierre/trees";
import type { GitReviewComment } from "~/lib/git/types";
import type { GitDiffFile } from "~/lib/git/types";
import {
  diffFilesToGitStatus,
  diffFilesToTreePaths,
} from "~/lib/git/diff-file-tree";
import { useTheme } from "next-themes";
import { useEffect, useMemo, useRef } from "react";
import { cn } from "~/lib/utils";

export function DiffFileTree({
  files,
  activePath,
  onSelectPath,
  commentCountByPath,
  className,
}: {
  files: GitDiffFile[];
  activePath: string | null;
  onSelectPath: (path: string) => void;
  commentCountByPath?: Map<string, number>;
  className?: string;
}) {
  const { resolvedTheme } = useTheme();
  const paths = useMemo(() => diffFilesToTreePaths(files), [files]);
  const gitStatus = useMemo(() => diffFilesToGitStatus(files), [files]);
  const pathSet = useMemo(() => new Set(paths), [paths]);
  const onSelectPathRef = useRef(onSelectPath);
  onSelectPathRef.current = onSelectPath;

  const { model } = useFileTree({
    paths,
    gitStatus,
    flattenEmptyDirectories: true,
    initialExpansion: "open",
    icons: "standard",
    density: "compact",
    initialSelectedPaths: activePath ? [activePath] : [],
    onSelectionChange: (selected) => {
      const filePath = [...selected]
        .reverse()
        .find((p) => pathSet.has(p));
      if (filePath) onSelectPathRef.current(filePath);
    },
    renderRowDecoration: commentCountByPath
      ? (ctx) => {
          const count = commentCountByPath.get(ctx.item.path);
          if (!count) return null;
          return { text: String(count), title: `${count} comment${count === 1 ? "" : "s"}` };
        }
      : undefined,
  });

  useEffect(() => {
    model.resetPaths(paths);
    model.setGitStatus(gitStatus);
  }, [model, paths, gitStatus]);

  useEffect(() => {
    if (!activePath || !pathSet.has(activePath)) return;
    const selected = model.getSelectedPaths();
    if (!selected.includes(activePath)) {
      for (const p of selected) {
        model.getItem(p)?.deselect();
      }
      model.getItem(activePath)?.select();
    }
    model.scrollToPath(activePath, { focus: false });
  }, [model, activePath, pathSet]);

  const hostStyle = useMemo(
    () =>
      themeToTreeStyles({
        type: resolvedTheme === "dark" ? "dark" : "light",
      }),
    [resolvedTheme]
  );

  return (
    <div
      className={cn(
        "relative min-h-0 min-w-0 flex-1 overflow-hidden",
        className
      )}
    >
      <FileTree
        model={model}
        className="absolute inset-0 block min-h-0 w-full"
        style={hostStyle}
      />
    </div>
  );
}

export function buildCommentCountByPath(
  comments: GitReviewComment[]
): Map<string, number> {
  const counts = new Map<string, number>();
  for (const c of comments) {
    counts.set(c.path, (counts.get(c.path) ?? 0) + 1);
  }
  return counts;
}
