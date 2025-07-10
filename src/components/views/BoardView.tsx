import {
  DndContext,
  DragEndEvent,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import TaskCard from "~/components/TaskCard";
import TaskColumn from "~/components/TaskColumn";
import { Priority, Status, Task, UpdateTask } from "~/db/schema";

type TaskViewProps = {
  tasks: Task[];
  statuses: Status[];
  priorityOrder: Priority[];
  updateTask: (task: UpdateTask) => Promise<void>;
  onOpenTask?: (task: Task) => void;
};

export const BoardView = ({
  tasks,
  statuses,
  priorityOrder,
  updateTask,
  onOpenTask,
}: TaskViewProps) => {
  const handleDrop = (e: DragEndEvent) => {
    const taskId = (e.active.id as string).split(":")[1];
    const statusId = (e.over?.id as string).split(":")[1];
    updateTask({
      id: taskId,
      statusId,
    });
  };
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    })
  );

  const tasksByStatus = tasks.reduce((acc, task) => {
    if (!task.statusId) {
      return {
        ...acc,
        unassigned: [...(acc.unassigned || []), task],
      };
    }

    const status = statuses.find((status) => status.id === task.statusId);
    if (!status) return acc;

    return {
      ...acc,
      [status.id]: [...(acc[status.id] || []), task],
    };
  }, {} as Record<string, Task[]>);

  return (
    <DndContext onDragEnd={handleDrop} sensors={sensors}>
      <div className="flex overflow-x-auto gap-3 h-full grow">
        {tasksByStatus["unassigned"] ? (
          <TaskColumn
            key="unassigned"
            numberOfTasks={tasksByStatus["unassigned"]?.length || 0}
          >
            {[...tasksByStatus["unassigned"]]
              .sort(
                (a, b) =>
                  priorityOrder.indexOf(b.priority) -
                  priorityOrder.indexOf(a.priority)
              )
              .sort(
                (a, b) =>
                  (a.deadline?.getTime() || 0) - (b.deadline?.getTime() || 0)
              )
              .map((task) => {
                return (
                  <TaskCard
                    onClick={() => onOpenTask?.(task)}
                    key={task.id}
                    task={task}
                  />
                );
              })}
          </TaskColumn>
        ) : null}
        {[...statuses].map((status) => {
          return (
            <TaskColumn
              key={status.id}
              status={status}
              numberOfTasks={tasksByStatus[status.id]?.length || 0}
            >
              {tasksByStatus[status.id]
                ? [...tasksByStatus[status.id]]
                    .sort(
                      (a, b) =>
                        priorityOrder.indexOf(b.priority) -
                        priorityOrder.indexOf(a.priority)
                    )
                    .sort(
                      (a, b) =>
                        (a.deadline?.getTime() || 0) -
                        (b.deadline?.getTime() || 0)
                    )
                    .map((task) => {
                      return (
                        <TaskCard
                          onClick={() => onOpenTask?.(task)}
                          key={task.id}
                          task={task}
                        />
                      );
                    })
                : null}
            </TaskColumn>
          );
        })}
      </div>
    </DndContext>
  );
};
