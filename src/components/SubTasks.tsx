import { SubTask, TaskWithRelations } from "~/db/schema";
import { Input } from "./ui/input";
import { Button } from "./ui/button";
import {
  useCreateSubTaskMutation,
  useUpdateSubTaskMutation,
} from "~/db/mutations/sub-tasks";
import { useState } from "react";
import { SubTaskItem } from "./SubTaskItem";
import { Progress } from "./ui/progress";

export function SubTasks({
  task,
  setPreventClose,
}: {
  task: TaskWithRelations;
  setPreventClose: (preventClose: boolean) => void;
}) {
  const [isLoading, setIsLoading] = useState(false);
  const createSubTask = useCreateSubTaskMutation();
  const updateSubTask = useUpdateSubTaskMutation();

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    const formData = new FormData(e.currentTarget);
    await createSubTask({
      taskId: task.id,
      description: formData.get("description") as string,
      done: false,
      projectId: task.projectId,
    });
    (e.target as HTMLFormElement).reset();
    setIsLoading(false);
  };

  const handleToggle = async (subTask: SubTask) => {
    await updateSubTask({
      id: subTask.id,
      done: !subTask.done,
      projectId: task.projectId,
      taskId: task.id,
    });
  };

  const percentageComplete = Math.round(
    (task.subTasks.filter((t) => t.done).length / task.subTasks.length) * 100
  );
  return (
    <div className="flex flex-col gap-2">
      <Progress value={percentageComplete} />
      <div className="bg-gray-50 border p-1 rounded-md flex flex-col gap-2">
        <ul className="flex flex-col border rounded-md divide-y [&>li:first-child]:rounded-t-md [&>li:last-child]:rounded-b-md">
          {task.subTasks
            .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
            .map((subTask) => (
              <SubTaskItem
                subTask={subTask}
                key={subTask.id}
                setPreventClose={setPreventClose}
                onToggle={() => {
                  handleToggle(subTask);
                }}
              />
            ))}
        </ul>
        <form onSubmit={handleSubmit} className="flex gap-2">
          <Input name="description" placeholder="Create a new subtask" />
          <Button loading={isLoading} type="submit">
            Add subtask
          </Button>
        </form>
      </div>
    </div>
  );
}
