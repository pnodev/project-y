import { useNavigate } from "@tanstack/react-router";
import {
  Dialog,
  DialogContent,
  DialogDescription,
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

  return (
    <Dialog
      open={!!task}
      onOpenChange={() => {
        navigate({ to: "/tasks/$", params: { _splat: "" } });
      }}
    >
      <DialogContent size="large" aria-describedby={`task-title-${task?.id}`}>
        <DialogDescription className="sr-only">{task?.name}</DialogDescription>
        <DialogHeader>
          <EditableDialogTitle
            id={`task-title-${task?.id}`}
            initialContent={task?.name || ""}
            onBlur={handleUpdateTitle}
            onDebouncedUpdate={handleUpdateTitle}
          />
        </DialogHeader>
        {task && currentStatus ? (
          <div className="grid grid-cols-12 gap-2">
            <div className="col-span-12">
              <Labels task={task} labels={labels} />
            </div>
            <div className="col-span-8 flex flex-col gap-3">
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
              <RichtextEditor
                content={task?.description || ""}
                onUpdate={(data) => {
                  if (!task) return;
                  handleUpdateTask({ id: task.id, description: data.text });
                }}
              />
            </div>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
