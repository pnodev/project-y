import { useDraggable } from "@dnd-kit/core";
import { useState, type MouseEvent } from "react";
import { useStore } from "@tanstack/react-store";
import { GripVertical, UserPlus } from "lucide-react";
import { UserSelect } from "~/components/UserSelect";
import { PrioritySwitch } from "~/components/PrioritySwitch";
import { Checkbox } from "~/components/ui/checkbox";
import { DateDisplay } from "~/components/ui/date-display";
import { LabelBadge } from "~/components/ui/label-badge";
import { Avatar, AvatarFallback, AvatarImage } from "~/components/ui/avatar";
import {
  useAssignTaskMutation,
  useUnassignTaskMutation,
} from "~/db/mutations/tasks";
import type { Priority, TaskWithRelations, UpdateTask } from "~/db/schema";
import { cn } from "~/lib/utils";
import {
  handleTaskSelectClick,
  setHoveredTaskId,
  shouldIgnoreRowSelectClick,
} from "./task-selection";
import { TaskViewStore, toggleTaskId } from "./task-view-store";
import { TruncatedTooltip } from "~/components/ui/truncated-tooltip";
import { TaskViewLink } from "./task-view-link";
import type { TaskViewLocation } from "./task-view-types";
import {
  listGridStyle,
  LIST_ROW_X,
  type ListColumnFlags,
} from "./list-view-layout";
import { isTaskOverdue } from "~/lib/statuses";

const priorityDotClass: Record<Priority, string> = {
  low: "bg-blue-500",
  medium: "bg-neutral-400",
  high: "bg-orange-500",
  critical: "bg-red-500",
};

function taskSubtitle(
  task: TaskWithRelations,
  flags: ListColumnFlags
): string | null {
  const parts: string[] = [];
  if (flags.showProject) parts.push(task.project.name);
  if (flags.showSprint && task.sprint) parts.push(task.sprint.name);
  return parts.length > 0 ? parts.join(" · ") : null;
}

export function TaskListRow({
  task,
  orderedTaskIds,
  location,
  columnFlags,
  updateTask,
  isOverlay = false,
  closingStatusId,
}: {
  task: TaskWithRelations;
  orderedTaskIds: string[];
  location: TaskViewLocation;
  columnFlags: ListColumnFlags;
  updateTask: (task: UpdateTask) => Promise<void>;
  isOverlay?: boolean;
  closingStatusId?: string;
}) {
  const { showSprint } = columnFlags;
  const assignTask = useAssignTaskMutation();
  const unassignTask = useUnassignTaskMutation();
  const [isAssigningUser, setIsAssigningUser] = useState(false);

  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `task:${task.id}`,
    disabled: isOverlay,
  });

  const isSelected = useStore(TaskViewStore, (state) =>
    state.selectedTaskIds.includes(task.id)
  );
  const isOverdue = isTaskOverdue(task, { closingStatusId });
  const subtitle = taskSubtitle(task, columnFlags);
  const assigneeIds = task.assignees.map((a) => a.userId);

  const handlePriorityChange = (priority: Priority) => {
    void updateTask({
      id: task.id,
      priority,
      projectId: task.projectId,
      sprintId: task.sprintId ?? undefined,
    }).catch(() => undefined);
  };

  const handleRowSelectCapture = (event: MouseEvent) => {
    if (isOverlay) return;
    if (!(event.shiftKey || event.metaKey || event.ctrlKey)) return;
    if (shouldIgnoreRowSelectClick(event.target)) return;

    event.preventDefault();
    event.stopPropagation();
    handleTaskSelectClick(task.id, orderedTaskIds, {
      shiftKey: event.shiftKey,
      metaKey: event.metaKey,
      ctrlKey: event.ctrlKey,
    });
  };

  const handleAssigneeChange = async (ids: string[]) => {
    setIsAssigningUser(true);
    try {
      const add = ids.filter(
        (id) => !task.assignees.some((assignee) => assignee.userId === id)
      );
      const remove = task.assignees
        .map((a) => a.userId)
        .filter((id) => !ids.includes(id));
      await Promise.all([
        assignTask(task, add),
        unassignTask(task, remove),
      ]);
    } finally {
      setIsAssigningUser(false);
    }
  };

  return (
    <div
      ref={isOverlay ? undefined : setNodeRef}
      className={cn(
        "group grid items-center gap-x-4 text-sm transition-colors",
        LIST_ROW_X,
        "py-3",
        isOverlay &&
          "rounded-md bg-background shadow-lg ring-1 ring-border/50",
        !isOverlay && "border-b border-border/40 hover:bg-muted/50",
        !isOverlay && isSelected && "bg-primary/[0.04]",
        !isOverlay && isDragging && "opacity-50"
      )}
      style={listGridStyle(columnFlags)}
      onMouseEnter={() => !isOverlay && setHoveredTaskId(task.id)}
      onMouseLeave={() => {
        if (!isOverlay && TaskViewStore.state.hoveredTaskId === task.id) {
          setHoveredTaskId(null);
        }
      }}
      onClickCapture={handleRowSelectCapture}
    >
      <div className="flex items-center gap-1">
        {!isOverlay ? (
          <Checkbox
            checked={isSelected}
            onCheckedChange={() => toggleTaskId(task.id)}
            aria-label={`Select ${task.name}`}
          />
        ) : (
          <span className="size-4 shrink-0" />
        )}
        <button
          type="button"
          data-row-select-ignore
          className={cn(
            "flex shrink-0 justify-center text-muted-foreground/40",
            "opacity-0 transition-opacity group-hover:opacity-100 active:cursor-grabbing",
            isOverlay ? "cursor-grabbing opacity-100" : "cursor-grab touch-none"
          )}
          aria-label={`Drag ${task.name}`}
          {...listeners}
          {...attributes}
        >
          <GripVertical className="size-4" />
        </button>
      </div>

      <div className="min-w-0 overflow-hidden">
        <TruncatedTooltip content={task.name}>
          <TaskViewLink
            location={location}
            showSprint={showSprint}
            projectId={task.projectId}
            sprintId={task.sprintId}
            taskId={task.id}
            className="font-semibold leading-[1.3] tracking-[-0.01em] text-foreground"
            onSelectClick={(event) =>
              handleTaskSelectClick(task.id, orderedTaskIds, {
                shiftKey: event.shiftKey,
                metaKey: event.metaKey,
                ctrlKey: event.ctrlKey,
              })
            }
          >
            {task.name}
          </TaskViewLink>
        </TruncatedTooltip>
        {subtitle ? (
          <p className="mt-0.5 truncate text-xs text-muted-foreground">
            {subtitle}
          </p>
        ) : null}
      </div>

      <div className="flex min-w-0 items-center gap-1 overflow-hidden">
        {task.labels.length > 0 ? (
          task.labels.slice(0, 2).map((label) => (
            <LabelBadge
              key={label.id}
              color={label.color || "neutral"}
              size="very-small"
            >
              {label.name}
            </LabelBadge>
          ))
        ) : (
          <span className="text-xs text-muted-foreground/40">—</span>
        )}
        {task.labels.length > 2 ? (
          <span className="shrink-0 text-xs text-muted-foreground">
            +{task.labels.length - 2}
          </span>
        ) : null}
      </div>

      <div
        className="flex justify-end"
        data-row-select-ignore
        onPointerDown={(e) => e.stopPropagation()}
      >
        {!isOverlay ? (
          <div
            className={cn(
              "inline-flex max-w-full items-center justify-end gap-1.5",
              "[&_[data-slot=select-trigger]]:h-8 [&_[data-slot=select-trigger]]:border-0",
              "[&_[data-slot=select-trigger]]:bg-transparent [&_[data-slot=select-trigger]]:shadow-none",
              "[&_[data-slot=select-trigger]]:px-0 [&_[data-slot=select-trigger]]:gap-1.5"
            )}
          >
            <span
              className={cn(
                "size-2 shrink-0 rounded-full",
                priorityDotClass[task.priority]
              )}
            />
            <PrioritySwitch
              priority={task.priority}
              onValueChange={handlePriorityChange}
            />
          </div>
        ) : (
          <span className="inline-flex items-center gap-1.5 capitalize text-muted-foreground">
            <span
              className={cn(
                "size-2 rounded-full",
                priorityDotClass[task.priority]
              )}
            />
            {task.priority}
          </span>
        )}
      </div>

      <div
        className={cn(
          "whitespace-nowrap text-right text-xs tabular-nums",
          isOverdue ? "font-medium text-red-600" : "text-muted-foreground"
        )}
      >
        {task.deadline ? (
          <DateDisplay date={task.deadline} variant="compact" />
        ) : (
          <span className="text-muted-foreground/40">—</span>
        )}
      </div>

      <div
        className="flex min-w-0 justify-end"
        data-row-select-ignore
        onPointerDown={(e) => e.stopPropagation()}
      >
        {!isOverlay ? (
          <UserSelect
            variant="inline"
            size="sm"
            isAssigning={isAssigningUser}
            selectedUserIds={assigneeIds}
            onValueChange={(ids) => void handleAssigneeChange(ids)}
            emptyTriggerComponent={
              <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                <UserPlus className="size-3.5" />
                Assign
              </span>
            }
          />
        ) : assigneeIds.length > 0 ? (
          <span className="inline-flex items-center gap-2 text-sm">
            <Avatar className="size-7">
              <AvatarFallback className="text-[10px]">?</AvatarFallback>
            </Avatar>
            <span className="truncate text-muted-foreground">
              {assigneeIds.length} assigned
            </span>
          </span>
        ) : (
          <span className="text-xs text-muted-foreground/40">—</span>
        )}
      </div>
    </div>
  );
}
