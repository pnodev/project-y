import { TaskWithRelations } from "~/db/schema";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { useDraggable } from "@dnd-kit/core";
import { ClientOnly, Link } from "@tanstack/react-router";
import { Badge } from "./ui/badge";
import { cn, getInitials } from "~/lib/utils";
import { DetailList, DetailListItem } from "./ui/detail-list";
import { Calendar, Flag, Paperclip, TextIcon, Users } from "lucide-react";
import { DateDisplay } from "./ui/date-display";
import { Avatar, AvatarFallback, AvatarImage, AvatarList } from "./ui/avatar";
import { useUsersQuery } from "~/db/queries/users";
import { useEffect, useState } from "react";
import { useAuth } from "@clerk/tanstack-react-start";
import { useUpdateTaskMutation } from "~/db/mutations/tasks";
import { EndlessLoadingSpinner } from "./EndlessLoadingSpinner";

export default function TaskCard({ task }: { task: TaskWithRelations }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `task:${task.id}`,
  });

  return (
    <ClientOnly fallback={<TaskCardComponent task={task} key={task.id} />}>
      <div
        ref={setNodeRef}
        style={{ opacity: isDragging ? 0.2 : undefined }}
        {...listeners}
        {...attributes}
      >
        <TaskCardComponent task={task} key={task.id} />
      </div>
    </ClientOnly>
  );
}

export const TaskCardComponent = ({ task }: { task: TaskWithRelations }) => {
  const isOverdue = task.deadline && task.deadline < new Date();
  const usersQuery = useUsersQuery();
  const currentUser = useAuth();
  const updateTask = useUpdateTaskMutation();
  const [isAssigning, setIsAssigning] = useState(false);

  const [isHovered, setIsHovered] = useState(false);
  useEffect(() => {
    const handleKeyPress = async (event: KeyboardEvent) => {
      if (currentUser && currentUser.userId && isHovered && event.key === "m") {
        setIsAssigning(true);
        if (task.assignees.includes(currentUser.userId)) {
          await updateTask({
            id: task.id,
            assignees: task.assignees.filter((assigneeId) => {
              return assigneeId !== currentUser.userId;
            }),
          });
        } else {
          await updateTask({
            id: task.id,
            assignees: [...task.assignees, currentUser.userId],
          });
        }
        setIsAssigning(false);
      }
    };

    window.addEventListener("keydown", handleKeyPress);
    return () => {
      window.removeEventListener("keydown", handleKeyPress);
    };
  }, [isHovered, task]);

  return (
    <Link
      to="/projects/$projectId/tasks/$taskId"
      params={{ projectId: task.projectId, taskId: task.id }}
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
          {task.labels.length ? (
            <div className="mb-4 flex flex-wrap gap-1">
              {task.labels.map((label) => (
                <Badge
                  key={label.id}
                  color={label.color || "neutral"}
                  size="very-small"
                >
                  {label.name}
                </Badge>
              ))}
            </div>
          ) : null}
          <CardTitle>{task.name}</CardTitle>
        </CardHeader>
        <CardContent className="p-3">
          <div className="[&>svg]:text-gray-400 [&>svg]:mb-2 [&>svg]:size-3.5 flex gap-2">
            {task.description ? <TextIcon /> : null}
            {task.attachments.length > 0 ? <Paperclip /> : null}
          </div>
          <DetailList size="small">
            <DetailListItem label="Assigned to:" icon={Users}>
              <EndlessLoadingSpinner
                isActive={isAssigning}
                className="size-4"
              />
              {!isAssigning ? (
                <AvatarList>
                  {(task.assignees as string[]).map((assigneeId) => {
                    const assignee = usersQuery.data.find(
                      (u) => u.id === assigneeId
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
    </Link>
  );
};
