import { useDraggable } from "@dnd-kit/core";
import { useMemo } from "react";
import { useStore } from "@tanstack/react-store";
import { GripVertical } from "lucide-react";
import { PrioritySwitch } from "~/components/PrioritySwitch";
import { Checkbox } from "~/components/ui/checkbox";
import { DateDisplay } from "~/components/ui/date-display";
import { LabelBadge } from "~/components/ui/label-badge";
import { Avatar, AvatarFallback, AvatarImage } from "~/components/ui/avatar";
import { useUsersQuery } from "~/db/queries/users";
import type { Priority, TaskWithRelations, UpdateTask } from "~/db/schema";
import { cn, getInitials } from "~/lib/utils";
import {
  handleTaskSelectClick,
  setHoveredTaskId,
} from "./task-selection";
import { TaskViewStore, toggleTaskId } from "./task-view-store";
import { TaskViewLink } from "./task-view-link";
import type { TaskViewLocation } from "./task-view-types";
import {
  listGridStyle,
  LIST_ROW_X,
  type ListColumnFlags,
} from "./list-view-layout";

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
}: {
  task: TaskWithRelations;
  orderedTaskIds: string[];
  location: TaskViewLocation;
  columnFlags: ListColumnFlags;
  updateTask: (task: UpdateTask) => Promise<void>;
  isOverlay?: boolean;
}) {
  const { showSprint } = columnFlags;
  const usersQuery = useUsersQuery();
  const usersById = useMemo(() => {
    const map = new Map<string, NonNullable<typeof usersQuery.data>[number]>();
    for (const user of usersQuery.data ?? []) {
      map.set(user.id, user);
    }
    return map;
  }, [usersQuery.data]);

  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `task:${task.id}`,
    disabled: isOverlay,
  });

  const isSelected = useStore(TaskViewStore, (state) =>
    state.selectedTaskIds.includes(task.id)
  );
  const isHovered = useStore(
    TaskViewStore,
    (state) => state.hoveredTaskId === task.id
  );
  const isOverdue = task.deadline && task.deadline < new Date();
  const subtitle = taskSubtitle(task, columnFlags);
  const primaryAssignee = task.assignees[0]
    ? usersById.get(task.assignees[0].userId)
    : undefined;
  const extraAssignees = task.assignees.length - 1;

  const handlePriorityChange = (priority: Priority) => {
    void updateTask({
      id: task.id,
      priority,
      projectId: task.projectId,
      sprintId: task.sprintId ?? undefined,
    }).catch(() => undefined);
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
        !isOverlay && "hover:bg-muted/50",
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
    >
      {!isOverlay ? (
        <Checkbox
          checked={isSelected}
          onCheckedChange={() => toggleTaskId(task.id)}
          aria-label={`Select ${task.name}`}
        />
      ) : (
        <span />
      )}

      <button
        type="button"
        className={cn(
          "flex justify-center text-muted-foreground/40",
          "opacity-0 transition-opacity group-hover:opacity-100 active:cursor-grabbing",
          isOverlay ? "cursor-grabbing opacity-100" : "cursor-grab touch-none"
        )}
        aria-label={`Drag ${task.name}`}
        {...listeners}
        {...attributes}
      >
        <GripVertical className="size-4" />
      </button>

      <div className="min-w-0">
        <TaskViewLink
          location={location}
          showSprint={showSprint}
          projectId={task.projectId}
          sprintId={task.sprintId}
          taskId={task.id}
          className="block truncate font-medium text-foreground hover:underline"
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
          "text-right text-xs tabular-nums",
          isOverdue ? "font-medium text-red-600" : "text-muted-foreground"
        )}
      >
        {task.deadline ? (
          <DateDisplay date={task.deadline} />
        ) : (
          <span className="text-muted-foreground/40">—</span>
        )}
      </div>

      <div className="flex min-w-0 items-center justify-end gap-2">
        {primaryAssignee ? (
          <>
            <Avatar className="size-7 shrink-0">
              <AvatarImage
                src={primaryAssignee.avatar || undefined}
                alt={primaryAssignee.name}
              />
              <AvatarFallback className="text-[10px]">
                {getInitials(primaryAssignee.name)}
              </AvatarFallback>
            </Avatar>
            <span className="min-w-0 truncate text-sm text-foreground/90">
              {primaryAssignee.name}
              {extraAssignees > 0 ? (
                <span className="text-muted-foreground">
                  {" "}
                  +{extraAssignees}
                </span>
              ) : null}
            </span>
          </>
        ) : (
          <span className="text-xs text-muted-foreground/40">—</span>
        )}
      </div>
    </div>
  );
}
