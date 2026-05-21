import { TaskWithRelations } from "~/db/schema";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { useDraggable } from "@dnd-kit/core";
import { ClientOnly, Link } from "@tanstack/react-router";
import { LabelBadge } from "./ui/label-badge";
import { cn, getInitials } from "~/lib/utils";
import { DetailList, DetailListItem } from "./ui/detail-list";
import {
  Calendar,
  ClockFading,
  Flag,
  Paperclip,
  TextIcon,
  Users,
} from "lucide-react";
import { DateDisplay } from "./ui/date-display";
import { Avatar, AvatarFallback, AvatarImage, AvatarList } from "./ui/avatar";
import { useUsersQuery } from "~/db/queries/users";
import { useEffect, useState } from "react";
import { authClient } from "~/lib/auth-client";
import {
  useAssignTaskMutation,
  useUnassignTaskMutation,
} from "~/db/mutations/tasks";
import { EndlessLoadingSpinner } from "./EndlessLoadingSpinner";
import { Progress } from "./ui/progress";
import { Badge } from "./ui/badge";
import { useStore } from "@tanstack/react-store";
import { BoardViewStore, toggleTaskId } from "./views/board-view-store";
import {
  clearTaskSelectionState,
  handleTaskCardSelectClick,
  setHoveredTaskId,
} from "./views/board-selection";

export default function TaskCard({
  task,
  columnTaskIds,
  showSprint,
  showProject,
  taskLinkTo,
}: {
  task: TaskWithRelations;
  columnTaskIds: string[];
  showSprint?: boolean;
  showProject?: boolean;
  taskLinkTo?: "project" | "sprint" | "all";
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `task:${task.id}`,
  });
  const isSelected = useStore(BoardViewStore, (state) =>
    state.selectedTaskIds.includes(task.id)
  );
  const isHovered = useStore(
    BoardViewStore,
    (state) => state.hoveredTaskId === task.id
  );

  return (
    <ClientOnly
      fallback={
        <TaskCardComponent
          task={task}
          key={task.id}
          showSprint={showSprint}
          showProject={showProject}
          taskLinkTo={taskLinkTo}
        />
      }
    >
      <div
        ref={setNodeRef}
        className="group relative"
        style={{ opacity: isDragging ? 0.2 : undefined }}
        onMouseEnter={() => setHoveredTaskId(task.id)}
        onMouseLeave={() => {
          if (BoardViewStore.state.hoveredTaskId === task.id) {
            setHoveredTaskId(null);
          }
        }}
      >
        <button
          type="button"
          aria-label={`Select ${task.name}`}
          className={cn(
            "absolute -left-0.5 top-0 bottom-0 z-10 w-1.5 rounded-l-sm transition-colors",
            "opacity-0 group-hover:opacity-100 hover:bg-primary/40",
            isSelected && "opacity-100 bg-primary",
            isHovered && !isSelected && "opacity-100 bg-primary/25"
          )}
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            toggleTaskId(task.id);
          }}
        />
        <div className="min-w-0" {...listeners} {...attributes}>
          <TaskCardComponent
            task={task}
            key={task.id}
            columnTaskIds={columnTaskIds}
            showSprint={showSprint}
            showProject={showProject}
            taskLinkTo={taskLinkTo}
            isSelected={isSelected}
            isHovered={isHovered}
          />
        </div>
      </div>
    </ClientOnly>
  );
}

const TaskCardLinkWrapper = ({
  to,
  params,
  children,
  onSelectClick,
}: {
  to: "project" | "sprint" | "all";
  params: Record<string, string | undefined>;
  children: React.ReactNode;
  onSelectClick: (event: React.MouseEvent) => void;
}) => {
  const handleClick = (e: React.MouseEvent) => {
    if (e.shiftKey || e.metaKey || e.ctrlKey) {
      e.preventDefault();
      onSelectClick(e);
      return;
    }
    if (BoardViewStore.state.selectedTaskIds.length > 0) {
      clearTaskSelectionState();
    }
  };

  if (to === "all") {
    return (
      <Link
        to="/tasks/$taskId"
        title="All Projects"
        params={{ taskId: params.taskId as string }}
        onClick={handleClick}
      >
        {children}
      </Link>
    );
  }

  if (to === "project") {
    return (
      <Link
        to="/projects/$projectId/tasks/$taskId"
        title="Project"
        params={{
          projectId: params.projectId as string,
          taskId: params.taskId as string,
        }}
        onClick={handleClick}
      >
        {children}
      </Link>
    );
  }
  return (
    <Link
      to="/sprints/$sprintId/tasks/$taskId"
      title="Sprint"
      params={{
        sprintId: params.sprintId as string,
        taskId: params.taskId as string,
      }}
      onClick={handleClick}
    >
      {children}
    </Link>
  );
};

export const TaskCardComponent = ({
  task,
  columnTaskIds = [],
  showSprint = true,
  showProject = true,
  taskLinkTo,
  isSelected = false,
  isHovered = false,
}: {
  task: TaskWithRelations;
  columnTaskIds?: string[];
  showSprint?: boolean;
  showProject?: boolean;
  taskLinkTo?: "project" | "sprint" | "all";
  isSelected?: boolean;
  isHovered?: boolean;
}) => {
  const isOverdue = task.deadline && task.deadline < new Date();
  const usersQuery = useUsersQuery();
  const { data: session } = authClient.useSession();
  const currentUserId = session?.user.id;
  const assignTask = useAssignTaskMutation();
  const unassignTask = useUnassignTaskMutation();
  const [isAssigning, setIsAssigning] = useState(false);

  const [isCardHovered, setIsCardHovered] = useState(false);
  useEffect(() => {
    const handleKeyPress = async (event: KeyboardEvent) => {
      if (currentUserId && isCardHovered && event.key === "m") {
        setIsAssigning(true);
        if (
          task.assignees.find((assignee) => assignee.userId === currentUserId)
        ) {
          await unassignTask(task, [currentUserId]);
        } else {
          await assignTask(task, [currentUserId]);
        }
        setIsAssigning(false);
      }
    };

    window.addEventListener("keydown", handleKeyPress);
    return () => {
      window.removeEventListener("keydown", handleKeyPress);
    };
  }, [isCardHovered, task, currentUserId, assignTask, unassignTask]);

  const percentageComplete = Math.round(
    (task.subTasks.filter((t) => t.done).length / task.subTasks.length) * 100
  );

  return (
    <TaskCardLinkWrapper
      to={taskLinkTo ?? (showSprint ? "project" : "sprint")}
      params={{
        projectId: task.projectId || undefined,
        taskId: task.id,
        sprintId: task.sprintId || undefined,
      }}
      onSelectClick={(event) =>
        handleTaskCardSelectClick(task.id, columnTaskIds, {
          shiftKey: event.shiftKey,
          metaKey: event.metaKey,
          ctrlKey: event.ctrlKey,
        })
      }
    >
      <Card
        className={cn(
          "cursor-pointer transition-colors",
          isOverdue ? "outline-2 bg-red-50 outline-red-400" : "",
          isSelected && "border-l-[3px] border-l-primary bg-primary/5",
          isHovered && !isSelected && "bg-accent/30"
        )}
        onMouseEnter={() => setIsCardHovered(true)}
        onMouseLeave={() => setIsCardHovered(false)}
      >
        <CardHeader className="p-3 -mt-1">
          {showProject ? (
            <div className="flex items-center gap-2 -mt-2 -mx-3 px-3 py-1.5 bg-yellow-50 border-b rounded-t-sm  text-xs">
              {task.project.logo ? (
                <img src={task.project.logo} className="size-3.5" />
              ) : null}
              {task.project.name}
            </div>
          ) : null}
          {task.labels.length ? (
            <div className="mb-4 flex flex-wrap gap-1">
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
          ) : null}
          <CardTitle>{task.name}</CardTitle>
        </CardHeader>
        <CardContent className="p-3">
          {task.subTasks.length ? (
            <Progress
              value={percentageComplete}
              className="-mt-4 mb-2"
              variant="card-progress"
            />
          ) : null}
          <div className="[&>svg]:text-gray-400 [&>svg]:mb-2 [&>svg]:size-3.5 flex gap-2">
            {task.description ? <TextIcon /> : null}
            {task.attachments.length > 0 ? <Paperclip /> : null}
          </div>
          <DetailList size="small">
            {task.sprint && showSprint ? (
              <DetailListItem label="Sprint:" icon={ClockFading}>
                <Badge
                  variant={
                    task.sprint.start < new Date() &&
                    task.sprint.end < new Date()
                      ? "secondary"
                      : "default"
                  }
                >
                  {task.sprint.name}
                </Badge>
              </DetailListItem>
            ) : null}
            <DetailListItem label="Assigned to:" icon={Users}>
              <EndlessLoadingSpinner
                isActive={isAssigning}
                spinnerClassName="size-4"
              />
              {!isAssigning ? (
                <AvatarList>
                  {task.assignees.map((taskAssignee) => {
                    const assignee = usersQuery.data.find(
                      (u) => u.id === taskAssignee.userId
                    );
                    if (!assignee) return null;
                    return (
                      <Avatar key={assignee.id} className="size-5 my-0">
                        <AvatarImage
                          src={assignee.avatar || undefined}
                          alt={assignee.name}
                        />
                        <AvatarFallback>
                          {getInitials(assignee.name)}
                        </AvatarFallback>
                      </Avatar>
                    );
                  })}
                </AvatarList>
              ) : null}
            </DetailListItem>
            <DetailListItem
              label="Priority:"
              icon={Flag}
              statusColor={
                task.priority === "high" || task.priority === "critical"
                  ? "text-red-500"
                  : undefined
              }
            >
              <span className="capitalize">{task.priority}</span>
            </DetailListItem>
            {task.deadline ? (
              <DetailListItem label="Due:" icon={Calendar}>
                <DateDisplay date={task.deadline} />
              </DetailListItem>
            ) : null}
          </DetailList>
        </CardContent>
      </Card>
    </TaskCardLinkWrapper>
  );
};
