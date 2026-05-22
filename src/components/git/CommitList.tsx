import type { GitCommit } from "~/lib/git/types";
import { formatRelativeTime } from "~/lib/format-relative-time";
import { cn } from "~/lib/utils";

/** Visible strip rows before the list scrolls (`h-10` per row → 12.5rem total). */
const STRIP_VISIBLE_ROWS = 5;

export function sortCommitsNewestFirst(commits: GitCommit[]): GitCommit[] {
  return [...commits].sort(
    (a, b) => b.committedAt.getTime() - a.committedAt.getTime()
  );
}

export function CommitList({
  commits,
  selectedSha,
  onSelect,
  layout = "sidebar",
  className,
}: {
  commits: GitCommit[];
  selectedSha?: string | null;
  onSelect: (sha: string) => void;
  /** `strip` = compact rows for a list above the diff (email-client style). */
  layout?: "sidebar" | "strip";
  className?: string;
}) {
  if (commits.length === 0) {
    return (
      <p className={cn("text-muted-foreground px-3 py-2 text-sm", className)}>
        No commits yet.
      </p>
    );
  }

  if (layout === "strip") {
    const scrollable = commits.length > STRIP_VISIBLE_ROWS;

    return (
      <div
        className={cn(
          scrollable && "max-h-[12.5rem] overflow-y-auto overscroll-contain",
          className
        )}
      >
        <ul className="divide-y divide-border/60" role="listbox">
          {commits.map((commit, index) => {
            const selected = selectedSha === commit.sha;
            const selectCommit = () => onSelect(commit.sha);
            const tabIndex =
              selected || (selectedSha == null && index === 0) ? 0 : -1;
            return (
              <li
                key={commit.sha}
                role="option"
                aria-selected={selected}
                tabIndex={tabIndex}
                onClick={selectCommit}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    selectCommit();
                  }
                }}
                className={cn(
                  "flex h-10 w-full cursor-pointer items-center gap-3 px-3 text-left transition-colors outline-none",
                  "hover:bg-muted/50 focus-visible:ring-2 focus-visible:ring-ring/50",
                  selected &&
                    "bg-primary/10 ring-1 ring-inset ring-primary/25"
                )}
              >
                <span className="shrink-0 font-mono text-xs font-semibold tabular-nums">
                  {commit.sha.slice(0, 7)}
                </span>
                <span className="min-w-0 flex-1 truncate text-sm leading-snug">
                  {commit.message}
                </span>
                <span className="text-muted-foreground hidden shrink-0 text-xs sm:inline">
                  {commit.authorLogin ?? "Unknown"}
                </span>
                <span className="text-muted-foreground shrink-0 text-xs tabular-nums">
                  {formatRelativeTime(commit.committedAt)}
                </span>
              </li>
            );
          })}
        </ul>
      </div>
    );
  }

  return (
    <ul className={cn("divide-y divide-border/60", className)}>
      {commits.map((commit) => (
        <li key={commit.sha}>
          <button
            type="button"
            onClick={() => onSelect(commit.sha)}
            className={cn(
              "hover:bg-muted/50 w-full cursor-pointer px-3 py-2.5 text-left transition-colors",
              selectedSha === commit.sha && "bg-muted"
            )}
          >
            <p className="truncate font-mono text-xs font-medium">
              {commit.sha.slice(0, 7)}
            </p>
            <p className="mt-0.5 line-clamp-2 text-sm leading-snug">
              {commit.message}
            </p>
            <p className="text-muted-foreground mt-1 text-xs">
              {commit.authorLogin ? `${commit.authorLogin} · ` : null}
              {formatRelativeTime(commit.committedAt)}
            </p>
          </button>
        </li>
      ))}
    </ul>
  );
}
