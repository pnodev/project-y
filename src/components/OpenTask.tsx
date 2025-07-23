import { useNavigate } from "@tanstack/react-router";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
} from "~/components/ui/dialog";
import {
  Comment,
  Label,
  Status,
  TaskWithLabels,
  UpdateTask,
} from "~/db/schema";
import { RichtextEditor } from "~/components/RichtextEditor/Editor";
import { useCallback } from "react";
import { useUpdateTaskMutation } from "~/db/mutations/tasks";
import { DateDisplay } from "~/components/ui/date-display";
import { DetailList, DetailListItem } from "~/components/ui/detail-list";
import { StatusSwitch } from "./StatusSwitch";
import { Labels } from "./Labels";
import { EditableDialogTitle } from "./EditableDialogTitle";
import { useAuth } from "@clerk/tanstack-react-start";
import { useCurrentOwningIdentity } from "~/hooks/use-current-owning-identity";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbSeparator,
} from "./ui/breadcrumb";
import { TaskLabel } from "./ui/TaskLabel";
import { CommentInput } from "./CommentInput";
import { useCreateCommentMutation } from "~/db/mutations/comments";
import { Comments } from "./Comments";
import { Calendar, CircleDashed, Flag, Users } from "lucide-react";
import { PrioritySwitch } from "./PrioritySwitch";
import { DateTimePicker } from "./ui/date-time-picker";

export function OpenTask({
  task,
  statuses,
  labels,
  comments,
}: {
  task?: TaskWithLabels;
  statuses: Status[];
  labels: Label[];
  comments: Comment[];
}) {
  const navigate = useNavigate();

  const updateTask = useUpdateTaskMutation();
  const createComment = useCreateCommentMutation();
  const currentUser = useAuth();
  const handleUpdateTask = useCallback(
    async (data: UpdateTask) => {
      await updateTask({
        ...data,
      });
    },
    [updateTask]
  );
  const currentStatus = statuses.find((status) => status.id === task?.statusId);

  const handleUpdateTitle = useCallback(
    async (content: string) => {
      if (!task?.id || !task.projectId) return;
      await handleUpdateTask({
        id: task?.id,
        name: content,
        projectId: task.projectId,
      });
    },
    [handleUpdateTask, task]
  );

  const handleComment = useCallback(
    async (content: string) => {
      if (!task?.id || !currentUser.userId) return;
      await createComment({
        taskId: task.id,
        content,
        author: currentUser.userId,
      });
    },
    [createComment, task]
  );

  const owner = useCurrentOwningIdentity();

  return (
    <Dialog
      open={!!task}
      onOpenChange={() => {
        navigate({
          to: `/projects/${task?.projectId}/tasks/$`,
          params: { _splat: "" },
        });
      }}
    >
      <DialogContent
        size="large"
        aria-describedby={`task-title-${task?.id}`}
        className="p-0 gap-0"
      >
        <DialogDescription className="sr-only">{task?.name}</DialogDescription>
        <DialogHeader className="border-b px-6 py-3">
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem className="gap-2.5">
                <img src={owner.avatar} className="h-5 w-5 rounded" />
                <span>{owner.name}</span>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>{task?.name}</BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </DialogHeader>
        {task && currentStatus ? (
          <div className="grid grid-cols-12 gap-3 content-stretch grow">
            <div className="col-span-8 flex flex-col gap-5.5 pt-4 pl-6">
              <EditableDialogTitle
                initialContent={task?.name || ""}
                onBlur={handleUpdateTitle}
                onDebouncedUpdate={handleUpdateTitle}
              />
              <Labels task={task} labels={labels} />
              <DetailList>
                <DetailListItem label="Status" icon={CircleDashed}>
                  <StatusSwitch
                    status={currentStatus}
                    statuses={statuses}
                    onValueChange={(statusId) => {
                      handleUpdateTask({
                        id: task.id,
                        statusId,
                        projectId: task.projectId,
                      });
                    }}
                  />
                </DetailListItem>
                <DetailListItem label="Priority" icon={Flag}>
                  <PrioritySwitch
                    priority={task?.priority}
                    onValueChange={(priority) => {
                      handleUpdateTask({
                        id: task.id,
                        priority,
                        projectId: task.projectId,
                      });
                    }}
                  />
                </DetailListItem>
                <DetailListItem
                  label="Due"
                  icon={Calendar}
                  statusColor={
                    task.deadline && task.deadline < new Date()
                      ? "text-red-500"
                      : undefined
                  }
                >
                  <DateTimePicker
                    date={task?.deadline || undefined}
                    setDate={(date) => {
                      if (!task) return;
                      handleUpdateTask({
                        id: task.id,
                        deadline: date,
                        projectId: task.projectId,
                      });
                    }}
                  />
                </DetailListItem>
                <DetailListItem
                  label="Assigned to"
                  icon={Users}
                ></DetailListItem>
              </DetailList>
              <hr />
              <RichtextEditor
                content={task?.description || ""}
                onUpdate={(data) => {
                  if (!task) return;
                  handleUpdateTask({
                    id: task.id,
                    description: data.text,
                    projectId: task.projectId,
                  });
                }}
              />
            </div>
            <div className="col-span-4 bg-gray-100 py-4 px-6 flex flex-col gap-4">
              <TaskLabel>Conversation</TaskLabel>
              <Comments
                className="grow"
                comments={comments.map((comment) => ({
                  ...comment,
                  authorAvatar: "", // Provide a default or dynamic value for authorAvatar here
                }))}
              />
              <CommentInput onSubmit={handleComment} />
            </div>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
