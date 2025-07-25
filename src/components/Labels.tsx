import { Plus } from "lucide-react";
import { Button } from "./ui/button";
import { Label, Task, TaskWithRelations } from "~/db/schema";
import { LabelSelect } from "./LabelSelect";
import {
  useSetLabelsForTaskMutation,
  useUpdateTaskMutation,
} from "~/db/mutations/tasks";
import { Badge } from "./ui/badge";
import { TaskLabel } from "./ui/TaskLabel";

export const Labels = ({
  task,
  labels,
}: {
  task?: TaskWithRelations;
  labels: Label[];
}) => {
  const setLabelsForTask = useSetLabelsForTaskMutation();
  const handleSetLabels = async (labelIds: string[]) => {
    if (!task) return;
    await setLabelsForTask(task, labelIds);
  };

  return (
    <div className="flex flex-col gap-2">
      <TaskLabel>Labels</TaskLabel>
      <div className="flex gap-2">
        <div className="flex flex-wrap gap-2">
          {task?.labels.map((label) => (
            <Badge size="large" key={label.id} color={label.color || "neutral"}>
              {label.name}
            </Badge>
          ))}
        </div>
        <LabelSelect
          labels={labels}
          selectedLabels={task?.labels.map((l) => l.id) || []}
          onSelect={handleSetLabels}
        />
      </div>
    </div>
  );
};
