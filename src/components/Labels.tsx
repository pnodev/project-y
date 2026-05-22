import { Label, TaskWithRelations } from "~/db/schema";
import { LabelSelect } from "./LabelSelect";
import { useSetLabelsForTaskMutation } from "~/db/mutations/tasks";
import { LabelBadge } from "./ui/label-badge";
import { useState } from "react";
import { EndlessLoadingSpinner } from "./EndlessLoadingSpinner";

export const Labels = ({
  task,
  labels,
}: {
  task?: TaskWithRelations;
  labels: Label[];
}) => {
  const setLabelsForTask = useSetLabelsForTaskMutation();
  const [isAssigning, setIsAssigning] = useState(false);
  const handleSetLabels = async (labelIds: string[]) => {
    if (!task) return;
    setIsAssigning(true);
    await setLabelsForTask(task, labelIds);
    setIsAssigning(false);
  };

  return (
    <div className="flex min-w-0 flex-wrap items-center gap-2">
      {task?.labels.map((label) => (
        <LabelBadge
          size="medium"
          key={label.id}
          color={label.color || "neutral"}
        >
          {label.name}
        </LabelBadge>
      ))}
      <EndlessLoadingSpinner
        isActive={isAssigning}
        className="flex items-center"
        spinnerClassName="size-4"
      />
      <LabelSelect
        labels={labels}
        selectedLabels={task?.labels.map((l) => l.id) || []}
        onSelect={handleSetLabels}
      />
    </div>
  );
};
