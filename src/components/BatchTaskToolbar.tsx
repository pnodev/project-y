import { useState } from "react";
import {
  Label,
  Priority,
  PRIORITY_VALUES,
  Status,
  TaskWithRelations,
} from "~/db/schema";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import { ConfirmDialog } from "./ConfirmDialog";
import {
  ChevronDown,
  CircleDashed,
  Flag,
  FolderKanban,
  Tags,
  Trash2,
  UserPlus,
} from "lucide-react";
import {
  useBatchAssignTasksMutation,
  useBatchDeleteTasksMutation,
  useBatchSetLabelsForTasksMutation,
  useBatchUpdateTasksMutation,
} from "~/db/mutations/tasks";
import { clearTaskSelectionState } from "./views/task-selection";
import { useSprintsQuery } from "~/db/queries/sprints";
import { useUsersQuery } from "~/db/queries/users";

/** Darker than theme primary for WCAG-friendly white-on-violet contrast */
const toolbarSurfaceClass =
  "fixed inset-x-0 bottom-0 z-[60] bg-[oklch(0.38_0.17_262)] text-white shadow-[0_-4px_24px_rgba(0,0,0,0.18)] border-t border-white/10";

const toolbarPillClass =
  "inline-flex h-8 shrink-0 cursor-pointer items-center gap-1.5 rounded-md bg-white/20 px-3 text-sm font-medium text-white transition-colors hover:bg-white/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50 disabled:pointer-events-none disabled:opacity-50";

const toolbarDeselectClass =
  "inline-flex h-8 shrink-0 cursor-pointer items-center rounded-md bg-white/25 px-3 text-sm font-medium text-white transition-colors hover:bg-white/35 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50 disabled:pointer-events-none disabled:opacity-50";

export function BatchTaskToolbar({
  selectedTasks,
  statuses,
  labels,
  location,
}: {
  selectedTasks: TaskWithRelations[];
  statuses: Status[];
  labels: Label[];
  location: "project" | "sprint" | "all";
}) {
  const [isApplying, setIsApplying] = useState(false);
  const [assignUserIds, setAssignUserIds] = useState<string[]>([]);
  const [labelDraftIds, setLabelDraftIds] = useState<string[]>([]);
  const batchUpdate = useBatchUpdateTasksMutation();
  const batchDelete = useBatchDeleteTasksMutation();
  const batchAssign = useBatchAssignTasksMutation();
  const batchSetLabels = useBatchSetLabelsForTasksMutation();
  const sprintsQuery = useSprintsQuery();
  const usersQuery = useUsersQuery();

  const taskIds = selectedTasks.map((t) => t.id);
  const count = selectedTasks.length;
  const projectIds = new Set(
    selectedTasks.map((t) => t.projectId).filter(Boolean)
  );
  const sprintDisabled = projectIds.size > 1;

  const runAction = async (action: () => Promise<void>) => {
    setIsApplying(true);
    try {
      await action();
      clearTaskSelectionState();
      setAssignUserIds([]);
      setLabelDraftIds([]);
    } finally {
      setIsApplying(false);
    }
  };

  return (
    <div
      role="toolbar"
      aria-label="Batch task actions"
      className={toolbarSurfaceClass}
    >
      <div className="flex items-center justify-between gap-4 px-4 py-3 sm:px-6">
        <div className="flex min-w-0 items-center gap-3">
          <span className="text-sm font-semibold text-white whitespace-nowrap">
            {count} selected
          </span>
          <button
            type="button"
            disabled={isApplying}
            className={toolbarDeselectClass}
            onClick={() => clearTaskSelectionState()}
          >
            Deselect
          </button>
        </div>

        <div className="flex min-w-0 flex-1 items-center justify-end gap-2 overflow-x-auto pb-0.5">
          <DropdownMenu>
            <DropdownMenuTrigger
              disabled={isApplying}
              className={toolbarPillClass}
            >
              <CircleDashed className="size-4" />
              Move to…
              <ChevronDown className="size-3.5 opacity-80" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="max-h-64 overflow-y-auto">
              <DropdownMenuItem
                onClick={() => {
                  void runAction(() =>
                    batchUpdate(taskIds, { statusId: null })
                  );
                }}
              >
                Unassigned
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              {statuses.map((status) => (
                <DropdownMenuItem
                  key={status.id}
                  onClick={() => {
                    void runAction(() =>
                      batchUpdate(taskIds, { statusId: status.id })
                    );
                  }}
                >
                  {status.name}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          <DropdownMenu>
            <DropdownMenuTrigger
              disabled={isApplying}
              className={toolbarPillClass}
            >
              <Flag className="size-4" />
              Priority
              <ChevronDown className="size-3.5 opacity-80" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {PRIORITY_VALUES.map((priority) => (
                <DropdownMenuItem
                  key={priority}
                  className="capitalize"
                  onClick={() => {
                    void runAction(() =>
                      batchUpdate(taskIds, { priority: priority as Priority })
                    );
                  }}
                >
                  {priority}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          <DropdownMenu
            onOpenChange={(open) => {
              if (open) setLabelDraftIds([]);
            }}
          >
            <DropdownMenuTrigger
              disabled={isApplying}
              className={toolbarPillClass}
            >
              <Tags className="size-4" />
              Labels
              <ChevronDown className="size-3.5 opacity-80" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              {labels.length === 0 ? (
                <DropdownMenuItem disabled>No labels</DropdownMenuItem>
              ) : (
                labels.map((label) => (
                  <DropdownMenuCheckboxItem
                    key={label.id}
                    checked={labelDraftIds.includes(label.id)}
                    onCheckedChange={(checked) => {
                      setLabelDraftIds((prev) =>
                        checked
                          ? [...prev, label.id]
                          : prev.filter((id) => id !== label.id)
                      );
                    }}
                  >
                    {label.name}
                  </DropdownMenuCheckboxItem>
                ))
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem
                disabled={isApplying || labelDraftIds.length === 0}
                onClick={() => {
                  if (labelDraftIds.length === 0) return;
                  void runAction(() => batchSetLabels(taskIds, labelDraftIds));
                }}
              >
                Apply labels
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <DropdownMenu>
            <DropdownMenuTrigger
              disabled={isApplying}
              className={toolbarPillClass}
            >
              <UserPlus className="size-4" />
              Assign
              <ChevronDown className="size-3.5 opacity-80" />
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              className="w-52 max-h-64 overflow-y-auto"
            >
              {usersQuery.data.map((user) => (
                <DropdownMenuCheckboxItem
                  key={user.id}
                  checked={assignUserIds.includes(user.id)}
                  onCheckedChange={(checked) => {
                    setAssignUserIds((prev) =>
                      checked
                        ? [...prev, user.id]
                        : prev.filter((id) => id !== user.id)
                    );
                  }}
                >
                  {user.name}
                </DropdownMenuCheckboxItem>
              ))}
              <DropdownMenuSeparator />
              <DropdownMenuItem
                disabled={isApplying || assignUserIds.length === 0}
                onClick={() => {
                  void runAction(() =>
                    batchAssign(selectedTasks, assignUserIds)
                  );
                }}
              >
                Add {assignUserIds.length} assignee
                {assignUserIds.length === 1 ? "" : "s"}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {location === "project" || location === "all" ? (
            sprintDisabled ? (
              <span
                className="hidden text-xs text-white/80 sm:inline whitespace-nowrap"
                title="Select tasks from one project to change sprint"
              >
                Sprint unavailable
              </span>
            ) : (
              <DropdownMenu>
                <DropdownMenuTrigger
                  disabled={isApplying}
                  className={toolbarPillClass}
                >
                  <FolderKanban className="size-4" />
                  Sprint
                  <ChevronDown className="size-3.5 opacity-80" />
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align="end"
                  className="max-h-64 overflow-y-auto"
                >
                  <DropdownMenuItem
                    onClick={() => {
                      void runAction(() =>
                        batchUpdate(taskIds, { sprintId: null })
                      );
                    }}
                  >
                    Remove from sprint
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  {sprintsQuery.data.map((sprint) => (
                    <DropdownMenuItem
                      key={sprint.id}
                      onClick={() => {
                        void runAction(() =>
                          batchUpdate(taskIds, { sprintId: sprint.id })
                        );
                      }}
                    >
                      {sprint.name}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            )
          ) : null}

          <ConfirmDialog
            title={`Delete ${count} tasks?`}
            description="This cannot be undone. All selected tasks and their attachments will be removed."
            confirmText="Delete"
            onConfirm={() => {
              void runAction(() => batchDelete(taskIds));
            }}
          >
            <button
              type="button"
              disabled={isApplying}
              className={toolbarPillClass}
            >
              <Trash2 className="size-4" />
              Delete {count} task{count === 1 ? "" : "s"}
            </button>
          </ConfirmDialog>
        </div>
      </div>
    </div>
  );
}
