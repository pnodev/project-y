import { Task, TaskWithLabels } from "~/db/schema";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { useDraggable } from "@dnd-kit/core";
import { ClientOnly } from "@tanstack/react-router";
import { Badge } from "./ui/badge";

export default function TaskCard({
  task,
  onClick,
}: {
  task: Task;
  onClick?: () => void;
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `task:${task.id}`,
  });

  return (
    <ClientOnly fallback={<TaskCardComponent task={task} key={task.id} />}>
      <div
        ref={setNodeRef}
        style={{ opacity: isDragging ? 0.2 : undefined }}
        {...listeners}
        {...attributes}
      >
        <TaskCardComponent onClick={onClick} task={task} key={task.id} />
      </div>
    </ClientOnly>
  );
}

export const TaskCardComponent = ({
  task,
  onClick,
}: {
  task: TaskWithLabels;
  onClick?: () => void;
}) => {
  return (
    <Card className="cursor-pointer" onClick={onClick}>
      <CardHeader>
        <div className="-mt-2 mb-2.5 flex flex-wrap gap-2">
          {task.labels.map((label) => (
            <Badge key={label.id} color={label.color || "neutral"} size="small">
              {label.name}
            </Badge>
          ))}
        </div>
        <CardTitle>{task.name}</CardTitle>
        {/* <CardDescription>{task.description}</CardDescription> */}
      </CardHeader>
    </Card>
  );
};
