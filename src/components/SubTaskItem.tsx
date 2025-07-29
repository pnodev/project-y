import { Circle, CircleCheck } from "lucide-react";
import { SubTask } from "~/db/schema";

export function SubTaskItem({
  subTask,
  onToggle,
}: {
  subTask: SubTask;
  onToggle: () => void;
}) {
  return (
    <li className="flex gap-2 items-center px-2 py-2 text-sm text-gray-900">
      <button type="button" className="cursor-pointer group" onClick={onToggle}>
        {subTask.done ? (
          <CircleCheck className="size-4 text-gray-600" />
        ) : (
          <>
            <CircleCheck className="size-4 text-gray-400 absolute opacity-0 group-hover:opacity-100" />
            <Circle className="size-4 text-gray-600 group-hover:opacity-0" />
          </>
        )}
      </button>
      {subTask.description}
    </li>
  );
}
