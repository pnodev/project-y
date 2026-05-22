import type { GitCommit } from "~/lib/git/types";
import { formatRelativeTime } from "~/lib/format-relative-time";
import { cn } from "~/lib/utils";

export function CommitList({
  commits,
  selectedSha,
  onSelect,
  className,
}: {
  commits: GitCommit[];
  selectedSha?: string | null;
  onSelect: (sha: string) => void;
  className?: string;
}) {
  if (commits.length === 0) {
    return (
      <p className={cn("text-muted-foreground p-4 text-sm", className)}>
        No commits yet on this branch.
      </p>
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
              "hover:bg-muted/50 w-full px-3 py-2.5 text-left transition-colors",
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
