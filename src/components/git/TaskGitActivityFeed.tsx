import { GitBranch } from "lucide-react";
import { TaskLabel } from "~/components/ui/TaskLabel";
import { useTaskGitContextQuery } from "~/db/queries/git";
import { useGitTaskLiveSync } from "~/hooks/use-git-task-live-sync";
import {
  formatDateTimeTooltip,
  formatRelativeTime,
} from "~/lib/format-relative-time";
import { formatGitActivityLabel } from "~/lib/git/activity-label";
import { cn } from "~/lib/utils";

export function TaskGitActivityFeed({
  taskId,
  className,
}: {
  taskId: string;
  className?: string;
}) {
  const { data, isLoading } = useTaskGitContextQuery(taskId);
  useGitTaskLiveSync(taskId);

  const activity = data?.activity ?? [];

  return (
    <div
      className={cn(
        "flex h-full min-h-0 flex-col gap-3 px-4 py-4",
        className
      )}
    >
      <TaskLabel>Activity</TaskLabel>
      <div className="min-h-0 flex-1 overflow-y-auto">
        {isLoading ? (
          <p className="text-muted-foreground text-sm">Loading…</p>
        ) : activity.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            Commits, branches, and pull requests linked to this task will appear
            here.
          </p>
        ) : (
          <ul className="space-y-4">
            {activity.map((a) => {
              const occurredAt = new Date(a.occurredAt);
              const label = formatGitActivityLabel(
                a.type,
                a.payload,
                a.actorLogin
              );
              const url =
                typeof a.payload.url === "string" ? a.payload.url : null;

              return (
                <li key={a.id} className="flex gap-2.5 text-sm">
                  <GitBranch className="text-foreground/50 mt-0.5 size-3.5 shrink-0" />
                  <div className="min-w-0 space-y-0.5">
                    {url ? (
                      <a
                        href={url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-foreground leading-snug underline-offset-2 hover:underline"
                      >
                        {label}
                      </a>
                    ) : (
                      <p className="text-foreground leading-snug">{label}</p>
                    )}
                    <time
                      className="text-muted-foreground block text-xs"
                      dateTime={occurredAt.toISOString()}
                      title={formatDateTimeTooltip(occurredAt)}
                    >
                      {formatRelativeTime(occurredAt)}
                    </time>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
