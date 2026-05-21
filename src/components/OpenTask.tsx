import { useNavigate } from "@tanstack/react-router";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
} from "~/components/ui/dialog";
import {
  Label,
  Status,
  TaskWithRelations,
  UpdateTask,
} from "~/db/schema";
import { RichtextEditor } from "~/components/RichtextEditor/Editor";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  useAssignTaskMutation,
  useDeleteTaskMutation,
  useUnassignTaskMutation,
  useUpdateTaskMutation,
} from "~/db/mutations/tasks";
import { DetailList, DetailListItem } from "~/components/ui/detail-list";
import { StatusSwitch } from "./StatusSwitch";
import { Labels } from "./Labels";
import { EditableDialogTitle } from "./EditableDialogTitle";
import { authClient } from "~/lib/auth-client";
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
import type { CommentWithAuthor } from "~/db/queries/comments";
import { Comments } from "./Comments";
import {
  Calendar,
  CircleDashed,
  ClockFading,
  Ellipsis,
  Flag,
  Trash2,
  Users,
} from "lucide-react";
import { PrioritySwitch } from "./PrioritySwitch";
import { DateTimePicker } from "./ui/date-time-picker";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import { ConfirmDialog } from "./ConfirmDialog";
import { useCreateAttachmentMutation } from "~/db/mutations/attachments";
import { AttachmentArea } from "./AttachmentArea";
import { useFileDragOver } from "~/hooks/use-file-drag-over";
import { allowFileDropPropagation } from "~/lib/file-drag";
import { UserSelect } from "./UserSelect";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { SubTasks } from "./SubTasks";
import { Badge } from "./ui/badge";
import { SprintSelect } from "./SprintSelect";

export function OpenTask({
  task,
  statuses,
  labels,
  comments,
  location,
}: {
  task?: TaskWithRelations;
  statuses: Status[];
  labels: Label[];
  comments: CommentWithAuthor[];
  location: "project" | "sprint" | "all";
}) {
  const navigate = useNavigate();

  const updateTask = useUpdateTaskMutation();
  const assignTask = useAssignTaskMutation();
  const unassignTask = useUnassignTaskMutation();
  const [isAssigningUser, setIsAssigningUser] = useState(false);
  const [isAssigningSprint, setIsAssigningSprint] = useState(false);
  const createComment = useCreateCommentMutation();
  const createAttachment = useCreateAttachmentMutation();
  const deleteTask = useDeleteTaskMutation();
  const { data: session } = authClient.useSession();
  const currentUserId = session?.user.id;
  const handleUpdateTask = useCallback(
    async (data: UpdateTask) => {
      await updateTask({
        ...data,
      });
    },
    [updateTask]
  );
  const currentStatus = statuses.find((status) => status.id === task?.statusId);
  const [isDeleting, setIsDeleting] = useState(false);

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
      if (!task?.id || !currentUserId) return;
      await createComment({
        taskId: task.id,
        content,
        author: currentUserId,
      });
    },
    [createComment, task, currentUserId]
  );

  const handleUpload = useCallback(
    async (
      data: {
        name: string;
        ufsUrl: string;
        key: string;
        size: number;
        type: string;
        serverData: { uploadedBy: string | null };
      }[]
    ) => {
      if (!task?.id || !currentUserId) return;
      await Promise.all(
        data.map(async (attachment) => {
          await createAttachment({
            taskId: task.id,
            providerFileId: attachment.key,
            url: attachment.ufsUrl,
            name: attachment.name,
            size: attachment.size,
            type: attachment.type,
            uploadedBy: attachment.serverData.uploadedBy as string,
          });
        })
      );
    },
    [createAttachment, task, currentUserId]
  );

  const owner = useCurrentOwningIdentity();
  const [preventClose, setPreventClose] = useState(false);
  const [taskTab, setTaskTab] = useState<"attachments" | "subtasks">(
    "attachments"
  );
  const dialogContentRef = useRef<HTMLDivElement>(null);
  const {
    isFileDragOver,
    onDragEnter: onTaskFileDragEnter,
    onDragLeave: onTaskFileDragLeave,
    onDragOver: onTaskFileDragOver,
    onDrop: onTaskFileDrop,
    onDragEnd: onTaskFileDragEnd,
    clearFileDragOver,
  } = useFileDragOver(dialogContentRef, {
    onFileDragStart: () => setTaskTab("attachments"),
  });

  useEffect(() => {
    if (!task) return;
    setTaskTab(task.subTasks.length > 0 ? "subtasks" : "attachments");
    clearFileDragOver();
  }, [task?.id, task?.subTasks.length, clearFileDragOver]);

  const handleTaskPanelDragEnter = useCallback(
    (event: React.DragEvent) => {
      allowFileDropPropagation(event);
      onTaskFileDragEnter(event);
    },
    [onTaskFileDragEnter]
  );

  const handleTaskPanelDragLeave = useCallback(
    (event: React.DragEvent) => {
      allowFileDropPropagation(event);
      onTaskFileDragLeave(event);
    },
    [onTaskFileDragLeave]
  );

  const handleTaskPanelDragOver = useCallback(
    (event: React.DragEvent) => {
      allowFileDropPropagation(event);
      onTaskFileDragOver(event);
    },
    [onTaskFileDragOver]
  );

  const handleTaskPanelDrop = useCallback(
    (event: React.DragEvent) => {
      allowFileDropPropagation(event);
      onTaskFileDrop(event);
    },
    [onTaskFileDrop]
  );

  return (
    <Dialog
      open={!!task}
      onOpenChange={() => {
        if (location === "all") {
          navigate({ to: "/tasks" });
        } else if (location === "project") {
          navigate({
            to: `/projects/${task?.projectId}/tasks/$`,
          });
        } else {
          navigate({
            to: `/sprints/${task?.sprintId}/tasks/$`,
          });
        }
      }}
    >
      <DialogContent
        ref={dialogContentRef}
        size="large"
        isLoading={isDeleting}
        className="p-0 gap-0"
        onDragEnter={handleTaskPanelDragEnter}
        onDragLeave={handleTaskPanelDragLeave}
        onDragOver={handleTaskPanelDragOver}
        onDrop={handleTaskPanelDrop}
        onDragEnd={onTaskFileDragEnd}
        onEscapeKeyDown={(e) => {
          if (preventClose) {
            e.preventDefault();
          }
        }}
      >
        <DialogDescription className="sr-only">{task?.name}</DialogDescription>
        <DialogHeader className="border-b px-6 py-3">
          <div className="flex justify-between items-center pr-6">
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem className="gap-2.5">
                  {owner.avatar ? (
                    <img src={owner.avatar} className="h-5 w-5 rounded" alt="" />
                  ) : null}
                  <span>{owner.name}</span>
                </BreadcrumbItem>
                <BreadcrumbSeparator />
                <BreadcrumbItem>{task?.project.name}</BreadcrumbItem>
                <BreadcrumbSeparator />
                <BreadcrumbItem>{task?.name}</BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
            <DropdownMenu>
              <DropdownMenuTrigger className="cursor-pointer">
                <Ellipsis className="h-6 w-6 text-gray-500" />
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuLabel>Task Options</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <ConfirmDialog
                  title="Confirm Deletion"
                  description={`Are you sure you want to delete this task? This action cannot be undone.`}
                  onConfirm={async () => {
                    if (!task) return;
                    setIsDeleting(true);
                    await deleteTask(task.id);
                    setIsDeleting(false);
                    if (location === "all") {
                      navigate({ to: "/tasks" });
                    } else if (location === "project") {
                      navigate({
                        to: `/projects/${task.projectId}/tasks`,
                      });
                    } else {
                      navigate({
                        to: `/sprints/${task.sprintId}/tasks`,
                      });
                    }
                  }}
                  confirmText="Delete"
                  cancelText="Cancel"
                >
                  <DropdownMenuItem
                    onSelect={(e) => {
                      e.preventDefault(); // Prevent the dropdown from closing immediately
                    }}
                    className="text-red-600 focus:text-red-600 focus:bg-red-50"
                  >
                    <Trash2 className="text-red-600" />
                    Delete
                  </DropdownMenuItem>
                </ConfirmDialog>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </DialogHeader>
        {task && currentStatus ? (
          <div className="grid grid-cols-12 content-stretch grow">
            <div className="col-span-8 flex flex-col gap-5.5 pt-4 pb-6 pl-6 pr-5.5 overflow-auto h-[calc(100vh-6rem-51px)]">
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
                <DetailListItem label="Assigned to" icon={Users}>
                  <UserSelect
                    isAssigning={isAssigningUser}
                    selectedUserIds={task.assignees.map(
                      (assignee) => assignee.userId
                    )}
                    onValueChange={async (ids) => {
                      if (!task) return;
                      setIsAssigningUser(true);
                      const add = ids.filter(
                        (id) =>
                          !task.assignees.find(
                            (assignee) => assignee.userId === id
                          )
                      );
                      const remove = task.assignees
                        .map((a) => a.userId)
                        .filter((assignee) => !ids.includes(assignee));

                      await Promise.all([
                        await assignTask(task, add),
                        await unassignTask(task, remove),
                      ]);
                      setIsAssigningUser(false);
                    }}
                  />
                </DetailListItem>
                <DetailListItem label="Sprint" icon={ClockFading}>
                  <SprintSelect
                    isAssigning={isAssigningSprint}
                    selectedSprintId={task.sprintId || undefined}
                    onValueChange={async (sprintId) => {
                      if (!task || !sprintId) return;
                      setIsAssigningSprint(true);
                      await updateTask({
                        id: task.id,
                        sprintId,
                      });
                      setIsAssigningSprint(false);
                    }}
                  />
                </DetailListItem>
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

              <Tabs
                value={taskTab}
                onValueChange={(value) =>
                  setTaskTab(value as "attachments" | "subtasks")
                }
              >
                <TabsList>
                  <TabsTrigger value="attachments">
                    Attachments
                    <Badge
                      variant={"secondary"}
                      className="h-5 min-w-5 rounded-full px-1 font-mono tabular-nums"
                    >
                      {task.attachments.length}
                    </Badge>
                  </TabsTrigger>
                  <TabsTrigger value="subtasks">
                    Subtasks
                    <Badge
                      variant={"secondary"}
                      className="h-5 min-w-5 rounded-full px-1 font-mono tabular-nums"
                    >
                      {task.subTasks.length}
                    </Badge>
                  </TabsTrigger>
                </TabsList>
                <TabsContent value="attachments">
                  <AttachmentArea
                    attachments={task.attachments}
                    onUpload={handleUpload}
                    fileDragOver={isFileDragOver}
                    onDismissFileDrag={clearFileDragOver}
                  />
                </TabsContent>
                <TabsContent value="subtasks">
                  <SubTasks task={task} setPreventClose={setPreventClose} />
                </TabsContent>
              </Tabs>
            </div>
            <div className="col-span-4 bg-gray-100 border-l py-4 px-6 flex flex-col gap-4 h-[calc(100vh-6rem-51px)]">
              <TaskLabel>Conversation</TaskLabel>
              <Comments
                className="grow"
                comments={comments.map((comment) => ({
                  ...comment,
                  author: comment.author || "Unknown",
                  authorAvatar: comment.authorAvatar ?? "",
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
