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

export default function TaskCard({ task }: { task: Task }) {
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
        <TaskCardComponent task={task} key={task.id} />
      </div>
    </ClientOnly>
  );
}

const TaskCardComponent = ({ task }: { task: Task }) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{task.name}</CardTitle>
        <CardDescription>{task.description}</CardDescription>
      </CardHeader>
    </Card>
  );
};
