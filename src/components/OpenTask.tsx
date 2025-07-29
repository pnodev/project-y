import { useNavigate } from "@tanstack/react-router";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
} from "~/components/ui/dialog";
import {
  Attachment,
  Comment,
  Label,
  Status,
  TaskWithRelations,
  UpdateTask,
} from "~/db/schema";
import { RichtextEditor } from "~/components/RichtextEditor/Editor";
import { useCallback, useState } from "react";
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
import {
  Calendar,
  CircleDashed,
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
import { UserSelect } from "./UserSelect";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { SubTasks } from "./SubTasks";
import { LabelBadge } from "./ui/label-badge";
import { Badge } from "./ui/badge";

export function OpenTask({
  task,
  statuses,
  labels,
  comments,
}: {
  task?: TaskWithRelations;
  statuses: Status[];
  labels: Label[];
  comments: Comment[];
}) {
  const navigate = useNavigate();

  const updateTask = useUpdateTaskMutation();
  const assignTask = useAssignTaskMutation();
  const unassignTask = useUnassignTaskMutation();
  const [isAssigning, setIsAssigning] = useState(false);
  const createComment = useCreateCommentMutation();
  const createAttachment = useCreateAttachmentMutation();
  const deleteTask = useDeleteTaskMutation();
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
      if (!task?.id || !currentUser.userId) return;
      await createComment({
        taskId: task.id,
        content,
        author: currentUser.userId,
      });
    },
    [createComment, task]
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
      if (!task?.id || !currentUser.userId) return;
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
    [createAttachment, task]
  );

  const owner = useCurrentOwningIdentity();

  return (
    <Dialog
      open={!!task}
      onOpenChange={() => {
        navigate({
          to: `/projects/${task?.projectId}/tasks/$`,
        });
      }}
    >
      <DialogContent
        size="large"
        aria-describedby={`task-title-${task?.id}`}
        isLoading={isDeleting}
        className="p-0 gap-0"
      >
        <DialogDescription className="sr-only">{task?.name}</DialogDescription>
        <DialogHeader className="border-b px-6 py-3">
          <div className="flex justify-between items-center pr-6">
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem className="gap-2.5">
                  <img src={owner.avatar} className="h-5 w-5 rounded" />
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
                    navigate({
                      to: `/projects/${task.projectId}/tasks`,
                    });
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
                    isAssigning={isAssigning}
                    selectedUserIds={task.assignees.map(
                      (assignee) => assignee.userId
                    )}
                    onValueChange={async (ids) => {
                      if (!task) return;
                      setIsAssigning(true);
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
                      setIsAssigning(false);
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
                defaultValue={
                  task.subTasks.length > 0 ? "subtasks" : "attachments"
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
                  />
                </TabsContent>
                <TabsContent value="subtasks">
                  <SubTasks task={task} />
                </TabsContent>
              </Tabs>
            </div>
            <div className="col-span-4 bg-gray-100 border-l py-4 px-6 flex flex-col gap-4 h-[calc(100vh-6rem-51px)]">
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
