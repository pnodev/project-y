import { useStore } from "@tanstack/react-store";
import { ClockFading, Folder } from "lucide-react";
import { PrioritySwitch } from "~/components/PrioritySwitch";
import { StatusSwitch } from "~/components/StatusSwitch";
import { Badge } from "~/components/ui/badge";
import { Checkbox } from "~/components/ui/checkbox";
import { DateDisplay } from "~/components/ui/date-display";
import { LabelBadge } from "~/components/ui/label-badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage, AvatarList } from "~/components/ui/avatar";
import { useUsersQuery } from "~/db/queries/users";
import type {
  Priority,
  Status,
  TaskWithRelations,
  UpdateTask,
} from "~/db/schema";
import { cn, getInitials } from "~/lib/utils";
import {
  handleTaskSelectClick,
  setHoveredTaskId,
} from "./task-selection";
import { TaskViewStore, toggleTaskId } from "./task-view-store";
import { TaskViewLink } from "./task-view-link";
import type { TaskViewLocation } from "./task-view-types";

export function TaskListRow({
  task,
  orderedTaskIds,
  statuses,
  location,
  showProject,
  showSprint,
  updateTask,
}: {
  task: TaskWithRelations;
  orderedTaskIds: string[];
  statuses: Status[];
  location: TaskViewLocation;
  showProject: boolean;
  showSprint: boolean;
  updateTask: (task: UpdateTask) => Promise<void>;
}) {
  const usersQuery = useUsersQuery();
  const isSelected = useStore(TaskViewStore, (state) =>
    state.selectedTaskIds.includes(task.id)
  );
  const isHovered = useStore(
    TaskViewStore,
    (state) => state.hoveredTaskId === task.id
  );
  const currentStatus = statuses.find((s) => s.id === task.statusId);
  const isOverdue = task.deadline && task.deadline < new Date();

  const handleStatusChange = (statusId: string) => {
    void updateTask({
      id: task.id,
      statusId,
      projectId: task.projectId,
      sprintId: task.sprintId ?? undefined,
    }).catch(() => undefined);
  };

  const handlePriorityChange = (priority: Priority) => {
    void updateTask({
      id: task.id,
      priority,
      projectId: task.projectId,
      sprintId: task.sprintId ?? undefined,
    }).catch(() => undefined);
  };

  return (
    <tr
      className={cn(
        "border-b border-border/60 transition-colors",
        isSelected && "bg-primary/5",
        isHovered && !isSelected && "bg-accent/30"
      )}
      onMouseEnter={() => setHoveredTaskId(task.id)}
      onMouseLeave={() => {
        if (TaskViewStore.state.hoveredTaskId === task.id) {
          setHoveredTaskId(null);
        }
      }}
    >
      <td className="w-10 px-2 py-2">
        <Checkbox
          checked={isSelected}
          onCheckedChange={() => toggleTaskId(task.id)}
          aria-label={`Select ${task.name}`}
        />
      </td>
      <td className="min-w-[200px] px-2 py-2">
        <TaskViewLink
          location={location}
          showSprint={showSprint}
          projectId={task.projectId}
          sprintId={task.sprintId}
          taskId={task.id}
          className="font-medium text-foreground hover:underline line-clamp-2"
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
      </td>
      <td className="w-36 px-2 py-2">
        {currentStatus ? (
          <StatusSwitch
            status={currentStatus}
            statuses={statuses}
            onValueChange={handleStatusChange}
          />
        ) : (
          <Select onValueChange={handleStatusChange}>
            <SelectTrigger size="sm" className="w-full">
              <SelectValue placeholder="Set status" />
            </SelectTrigger>
            <SelectContent>
              {statuses.map((status) => (
                <SelectItem key={status.id} value={status.id}>
                  {status.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </td>
      <td className="w-32 px-2 py-2">
        <PrioritySwitch
          priority={task.priority}
          onValueChange={handlePriorityChange}
        />
      </td>
      <td
        className={cn(
          "w-28 px-2 py-2 text-sm",
          isOverdue && "text-red-600 font-medium"
        )}
      >
        {task.deadline ? <DateDisplay date={task.deadline} /> : "—"}
      </td>
      <td className="w-28 px-2 py-2">
        <AvatarList>
          {task.assignees.map((taskAssignee) => {
            const assignee = usersQuery.data?.find(
              (u) => u.id === taskAssignee.userId
            );
            if (!assignee) return null;
            return (
              <Avatar key={assignee.id} className="size-6">
                <AvatarImage
                  src={assignee.avatar || undefined}
                  alt={assignee.name}
                />
                <AvatarFallback>{getInitials(assignee.name)}</AvatarFallback>
              </Avatar>
            );
          })}
        </AvatarList>
      </td>
      <td className="min-w-[120px] px-2 py-2">
        <div className="flex flex-wrap gap-1">
          {task.labels.map((label) => (
            <LabelBadge
              key={label.id}
              color={label.color || "neutral"}
              size="very-small"
            >
              {label.name}
            </LabelBadge>
          ))}
        </div>
      </td>
      {showProject ? (
        <td className="w-36 px-2 py-2">
          <span className="inline-flex max-w-full items-center gap-1 text-xs text-muted-foreground">
            {task.project.logo ? (
              <img
                src={task.project.logo}
                alt=""
                className="size-4 shrink-0 rounded-sm"
              />
            ) : (
              <Folder className="size-3.5 shrink-0" />
            )}
            <span className="truncate">{task.project.name}</span>
          </span>
        </td>
      ) : null}
      {showSprint ? (
        <td className="w-32 px-2 py-2">
          {task.sprint ? (
            <Badge
              variant={
                task.sprint.start < new Date() && task.sprint.end < new Date()
                  ? "secondary"
                  : "default"
              }
              className="text-xs"
            >
              <ClockFading className="mr-1 size-3" />
              {task.sprint.name}
            </Badge>
          ) : (
            "—"
          )}
        </td>
      ) : null}
    </tr>
  );
}
