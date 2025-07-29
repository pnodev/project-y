import { Circle, CircleCheck, Pencil } from "lucide-react";
import { SubTask } from "~/db/schema";
import { Input } from "./ui/input";
import { useEffect, useRef, useState } from "react";
import { Button } from "./ui/button";
import { useUpdateSubTaskMutation } from "~/db/mutations/sub-tasks";

export function SubTaskItem({
  subTask,
  onToggle,
  setPreventClose,
}: {
  subTask: SubTask;
  onToggle: () => void;
  setPreventClose: (preventClose: boolean) => void;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const updateSubTask = useUpdateSubTaskMutation();
  const ref = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEditing) {
      ref.current?.focus();
      setPreventClose(true);
    } else {
      setPreventClose(false);
    }
  }, [isEditing]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    await updateSubTask({
      id: subTask.id,
      description: formData.get("description") as string,
      projectId: subTask.projectId,
      taskId: subTask.taskId,
    });
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLFormElement>) => {
    if (e.key === "Escape") {
      e.preventDefault();
      e.stopPropagation();
      setIsEditing(false);
    }
  };

  return (
    <li className="pl-8 flex gap-2 items-center px-2 py-2 text-sm text-gray-900 bg-white relative">
      <button
        type="button"
        className="cursor-pointer group absolute left-0 top-0 bottom-0 px-2"
        onClick={onToggle}
      >
        {subTask.done ? (
          <CircleCheck className="size-4 text-green-600 group-hover:text-green-900" />
        ) : (
          <>
            <CircleCheck className="size-4 text-gray-400 absolute opacity-0 group-hover:opacity-100" />
            <Circle className="size-4 text-gray-600 group-hover:opacity-0" />
          </>
        )}
      </button>
      {isEditing ? (
        <form
          onSubmit={handleSubmit}
          className="flex-1 flex gap-2 items-center"
          onKeyDown={handleKeyDown}
        >
          <Input
            name="description"
            placeholder="Enter task name"
            defaultValue={subTask.description || ""}
            ref={ref}
          />
          <Button
            variant={"secondary"}
            type="button"
            onClick={() => setIsEditing(false)}
          >
            Cancel
          </Button>
          <Button type="submit">Save</Button>
        </form>
      ) : (
        <span className="flex items-center w-full grow text-sm text-gray-900">
          <span className="grow block">{subTask.description}</span>
          <Button
            variant={"sunken"}
            size={"sm"}
            type="button"
            onClick={() => setIsEditing(true)}
            title="Edit"
          >
            <Pencil className="h-5 w-5" />
          </Button>
        </span>
      )}
    </li>
  );
}
