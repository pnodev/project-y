import { Task } from "~/db/schema";
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
  const { attributes, listeners, setNodeRef, transform } = useDraggable({
    id: `task:${task.id}`,
  });
  const style = transform
    ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
      }
    : undefined;
  return (
    <ClientOnly fallback={<TaskCardComponent task={task} key={task.id} />}>
      <div ref={setNodeRef} style={style} {...listeners} {...attributes}>
        <TaskCardComponent onClick={onClick} task={task} key={task.id} />
      </div>
    </ClientOnly>
  );
}

const TaskCardComponent = ({
  task,
  onClick,
}: {
  task: Task;
  onClick?: () => void;
}) => {
  return (
    <Card className="cursor-pointer" onClick={onClick}>
      <CardHeader>
        <div className="-mt-2 mb-2.5">
          <Badge color={"orange"}>Backend</Badge>
        </div>
        <CardTitle>{task.name}</CardTitle>
        {/* <CardDescription>{task.description}</CardDescription> */}
      </CardHeader>
    </Card>
  );
};
