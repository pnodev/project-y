import { useNavigate } from "@tanstack/react-router";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import { Status, Task, UpdateTask } from "~/db/schema";
import { RichtextEditor } from "~/components/RichtextEditor/Editor";
import { useCallback } from "react";
import { useUpdateTaskMutation } from "~/db/mutations";
import { DateDisplay } from "~/components/ui/date-display";
import { DetailList, DetailListItem } from "~/components/ui/detail-list";
import { taskQueryOptions } from "~/db/queries";

export function OpenTask({
  task,
  statuses,
}: {
  task?: Task;
  statuses: Status[];
}) {
  const navigate = useNavigate();

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

  return (
    <Dialog
      open={!!task}
      onOpenChange={() => {
        navigate({ to: "/tasks/$", params: { _splat: "" } });
      }}
    >
      <DialogContent size="large">
        <DialogHeader>
          <DialogTitle>{task?.name}</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-12 gap-2">
          <div className="col-span-8">
            <DetailList>
              <DetailListItem label="Status">
                {currentStatus?.name}
              </DetailListItem>
              <DetailListItem label="Priority">{task?.priority}</DetailListItem>
              <DetailListItem label="Due">
                {task?.deadline ? <DateDisplay date={task?.deadline} /> : "--"}
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
      </DialogContent>
    </Dialog>
  );
}
