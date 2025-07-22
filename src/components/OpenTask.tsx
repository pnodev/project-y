import { useNavigate } from "@tanstack/react-router";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import { Label, Status, Task, TaskWithLabels, UpdateTask } from "~/db/schema";
import { RichtextEditor } from "~/components/RichtextEditor/Editor";
import { useCallback, useEffect, useState } from "react";
import { useUpdateTaskMutation } from "~/db/mutations/tasks";
import { DateDisplay } from "~/components/ui/date-display";
import { DetailList, DetailListItem } from "~/components/ui/detail-list";
import { StatusSwitch } from "./StatusSwitch";
import { Labels } from "./Labels";
import { ta } from "zod/v4/locales";
import { EditableDialogTitle } from "./EditableDialogTitle";
import { useOrganization } from "@clerk/tanstack-react-start";
import { useCurrentOwningIdentity } from "~/hooks/use-current-owning-identity";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbSeparator,
} from "./ui/breadcrumb";
import { SimpleEditor } from "./tiptap-templates/simple/simple-editor";
import { TaskLabel } from "./ui/TaskLabel";
import { CommentInput } from "./CommentInput";

export function OpenTask({
  task,
  statuses,
  labels,
}: {
  task?: TaskWithLabels;
  statuses: Status[];
  labels: Label[];
}) {
  const navigate = useNavigate();
  const [timer, setTimer] = useState<number | null>(null);

  useEffect(() => {
    return () => {
      if (timer) {
        clearTimeout(timer);
      }
    };
  }, []);

  const updateTask = useUpdateTaskMutation();
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
      if (!task?.id) return;
      await handleUpdateTask({
        id: task?.id,
        name: content,
      });
    },
    [handleUpdateTask, task]
  );

  const owner = useCurrentOwningIdentity();

  return (
    <Dialog
      open={!!task}
      onOpenChange={() => {
        navigate({ to: "/tasks/$", params: { _splat: "" } });
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
              <BreadcrumbItem>{owner.name}</BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>{task?.name}</BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </DialogHeader>
        {task && currentStatus ? (
          <div className="grid grid-cols-12 gap-3 content-stretch grow">
            <div className="col-span-8 flex flex-col gap-5 pt-4 pl-6">
              <EditableDialogTitle
                initialContent={task?.name || ""}
                onBlur={handleUpdateTitle}
                onDebouncedUpdate={handleUpdateTitle}
              />
              <Labels task={task} labels={labels} />
              <DetailList>
                <DetailListItem label="Status">
                  <StatusSwitch
                    status={currentStatus}
                    statuses={statuses}
                    onValueChange={(statusId) => {
                      handleUpdateTask({ id: task.id, statusId });
                    }}
                  />
                </DetailListItem>
                <DetailListItem label="Priority">
                  {task?.priority}
                </DetailListItem>
                <DetailListItem label="Due">
                  {task?.deadline ? (
                    <DateDisplay date={task?.deadline} />
                  ) : (
                    "--"
                  )}
                </DetailListItem>
                <DetailListItem label="Assigned to"></DetailListItem>
              </DetailList>
              <hr />
              <RichtextEditor
                content={task?.description || ""}
                onUpdate={(data) => {
                  if (!task) return;
                  handleUpdateTask({ id: task.id, description: data.text });
                }}
              />
            </div>
            <div className="col-span-4 bg-gray-100 py-4 px-6 flex flex-col gap-4">
              <TaskLabel>Conversation</TaskLabel>
              <div className="grow">foo</div>
              <CommentInput />
            </div>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
