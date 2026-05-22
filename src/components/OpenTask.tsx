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
  Code2,
  Ellipsis,
  Flag,
  LayoutList,
  Tags,
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
import { TaskDevelopmentSection } from "~/components/git/TaskDevelopmentSection";
import { TaskPullRequestReviewFeed } from "~/components/git/TaskPullRequestReviewFeed";
import { TaskGitReviewNavProvider } from "~/lib/git/task-git-review-nav";

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
  const [dialogView, setDialogView] = useState<"overview" | "development">(
    "overview"
  );
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
    if (!task?.id) return;
    setDialogView("overview");
    setTaskTab(task.subTasks.length > 0 ? "subtasks" : "attachments");
    clearFileDragOver();
    // Intentionally only when switching tasks — not when subtask count changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- task?.id
  }, [task?.id, clearFileDragOver]);

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
        className="flex max-h-full flex-col gap-0 overflow-hidden rounded-md p-0"
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
        <DialogHeader className="shrink-0 border-b border-border/60 px-4 py-3">
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
                <Ellipsis className="text-muted-foreground size-6" />
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
                    variant="destructive"
                    onSelect={(e) => {
                      e.preventDefault(); // Prevent the dropdown from closing immediately
                    }}
                  >
                    <Trash2 />
                    Delete
                  </DropdownMenuItem>
                </ConfirmDialog>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </DialogHeader>
        {task && currentStatus ? (
          <TaskGitReviewNavProvider
            onOpenDevelopment={() => setDialogView("development")}
          >
          <div className="grid min-h-0 flex-1 grid-cols-12">
            <div className="col-span-8 flex min-h-0 flex-col">
              <Tabs
                value={dialogView}
                onValueChange={(value) =>
                  setDialogView(value as "overview" | "development")
                }
                className="flex min-h-0 flex-1 flex-col gap-0"
              >
                <div className="shrink-0">
                  <TabsList
                    variant="dialog"
                    className="border-b border-border/60"
                  >
                    <TabsTrigger variant="dialog" value="overview">
                      <LayoutList className="size-3.5" />
                      Overview
                    </TabsTrigger>
                    <TabsTrigger variant="dialog" value="development">
                      <Code2 className="size-3.5" />
                      Development
                    </TabsTrigger>
                  </TabsList>
                </div>

                <TabsContent
                  value="overview"
                  className="mt-0 flex min-h-0 flex-1 flex-col gap-5.5 overflow-auto px-4 pb-6 pt-4 data-[state=inactive]:hidden"
                >
                  <div className="pb-2">
                    <EditableDialogTitle
                      initialContent={task.name}
                      onBlur={handleUpdateTitle}
                      onDebouncedUpdate={handleUpdateTitle}
                    />
                  </div>
                  <div className="border-b border-border/60 pb-4">
                    <DetailList>
                      <DetailListItem
                        label="Labels"
                        icon={Tags}
                        align="start"
                        className="col-span-2"
                      >
                        <Labels task={task} labels={labels} />
                      </DetailListItem>
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
                          priority={task.priority}
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
                          date={task.deadline || undefined}
                          setDate={(date) => {
                            handleUpdateTask({
                              id: task.id,
                              deadline: date ?? null,
                              projectId: task.projectId,
                            });
                          }}
                        />
                      </DetailListItem>
                      <DetailListItem label="Assigned to" icon={Users}>
                        <UserSelect
                          variant="bare"
                          size="sm"
                          isAssigning={isAssigningUser}
                          selectedUserIds={task.assignees.map(
                            (assignee) => assignee.userId
                          )}
                          onValueChange={async (ids) => {
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
                              assignTask(task, add),
                              unassignTask(task, remove),
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
                            setIsAssigningSprint(true);
                            try {
                              await updateTask({
                                id: task.id,
                                sprintId: sprintId ?? null,
                              });
                            } finally {
                              setIsAssigningSprint(false);
                            }
                          }}
                        />
                      </DetailListItem>
                    </DetailList>
                  </div>
                  <RichtextEditor
                    content={task.description || ""}
                    onUpdate={(data) => {
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
                          variant="secondary"
                          className="h-5 min-w-5 rounded-full px-1 font-mono tabular-nums"
                        >
                          {task.attachments.length}
                        </Badge>
                      </TabsTrigger>
                      <TabsTrigger value="subtasks">
                        Subtasks
                        <Badge
                          variant="secondary"
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
                </TabsContent>

                <TabsContent
                  value="development"
                  className="mt-0 flex min-h-0 flex-1 flex-col overflow-hidden data-[state=inactive]:hidden"
                >
                  <TaskDevelopmentSection
                    layout="panel"
                    taskId={task.id}
                    taskName={task.name}
                    projectId={task.projectId}
                  />
                </TabsContent>
              </Tabs>
            </div>

            <aside className="col-span-4 flex min-h-0 flex-col overflow-hidden border-l border-border/60 bg-muted/30">
              {dialogView === "overview" ? (
                <div className="flex min-h-0 flex-1 flex-col gap-4 px-4 py-4">
                  <TaskLabel>Conversation</TaskLabel>
                  <Comments
                    className="min-h-0 grow"
                    comments={comments.map((comment) => ({
                      ...comment,
                      author: comment.author || "Unknown",
                      authorAvatar: comment.authorAvatar ?? "",
                    }))}
                  />
                  <CommentInput onSubmit={handleComment} />
                </div>
              ) : (
                <TaskPullRequestReviewFeed taskId={task.id} />
              )}
            </aside>
          </div>
          </TaskGitReviewNavProvider>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
