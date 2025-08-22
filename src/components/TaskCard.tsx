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
  Folder,
  Paperclip,
  TextIcon,
  Users,
} from "lucide-react";
import { DateDisplay } from "./ui/date-display";
import { Avatar, AvatarFallback, AvatarImage, AvatarList } from "./ui/avatar";
import { useUsersQuery } from "~/db/queries/users";
import { useEffect, useState } from "react";
import { useAuth } from "@clerk/tanstack-react-start";
import {
  useAssignTaskMutation,
  useUnassignTaskMutation,
} from "~/db/mutations/tasks";
import { EndlessLoadingSpinner } from "./EndlessLoadingSpinner";
import { Progress } from "./ui/progress";
import { Badge } from "./ui/badge";

export default function TaskCard({
  task,
  showSprint,
  showProject,
}: {
  task: TaskWithRelations;
  showSprint?: boolean;
  showProject?: boolean;
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `task:${task.id}`,
  });

  return (
    <ClientOnly
      fallback={
        <TaskCardComponent
          task={task}
          key={task.id}
          showSprint={showSprint}
          showProject={showProject}
        />
      }
    >
      <div
        ref={setNodeRef}
        style={{ opacity: isDragging ? 0.2 : undefined }}
        {...listeners}
        {...attributes}
      >
        <TaskCardComponent
          task={task}
          key={task.id}
          showSprint={showSprint}
          showProject={showProject}
        />
      </div>
    </ClientOnly>
  );
}

const TaskCardLinkWrapper = ({
  to,
  params,
  children,
}: {
  to: "project" | "sprint";
  params: Record<string, string | undefined>;
  children: React.ReactNode;
}) => {
  if (to === "project") {
    return (
      <Link
        to="/projects/$projectId/tasks/$taskId"
        title="Project"
        params={{
          projectId: params.projectId as string,
          taskId: params.taskId as string,
        }}
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
    >
      {children}
    </Link>
  );
};

export const TaskCardComponent = ({
  task,
  showSprint = true,
  showProject = true,
}: {
  task: TaskWithRelations;
  showSprint?: boolean;
  showProject?: boolean;
}) => {
  const isOverdue = task.deadline && task.deadline < new Date();
  const usersQuery = useUsersQuery();
  const currentUser = useAuth();
  const assignTask = useAssignTaskMutation();
  const unassignTask = useUnassignTaskMutation();
  const [isAssigning, setIsAssigning] = useState(false);

  const [isHovered, setIsHovered] = useState(false);
  useEffect(() => {
    const handleKeyPress = async (event: KeyboardEvent) => {
      if (currentUser && currentUser.userId && isHovered && event.key === "m") {
        setIsAssigning(true);
        if (
          task.assignees.find(
            (assignee) => assignee.userId === currentUser.userId
          )
        ) {
          await unassignTask(task, [currentUser.userId]);
        } else {
          await assignTask(task, [currentUser.userId]);
        }
        setIsAssigning(false);
      }
    };

    window.addEventListener("keydown", handleKeyPress);
    return () => {
      window.removeEventListener("keydown", handleKeyPress);
    };
  }, [isHovered, task]);

  const percentageComplete = Math.round(
    (task.subTasks.filter((t) => t.done).length / task.subTasks.length) * 100
  );

  return (
    <TaskCardLinkWrapper
      to={showSprint ? "project" : "sprint"}
      params={{
        projectId: task.projectId || undefined,
        taskId: task.id,
        sprintId: task.sprintId || undefined,
      }}
    >
      <Card
        className={cn(
          "cursor-pointer",
          isOverdue ? " outline-2 bg-red-50 outline-red-400" : ""
        )}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
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
                          src={assignee.avatar}
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
