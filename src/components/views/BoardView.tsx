import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { useState } from "react";
import TaskCard, { TaskCardComponent } from "~/components/TaskCard";
import TaskColumn from "~/components/TaskColumn";
import { Priority, Status, TaskWithRelations, UpdateTask } from "~/db/schema";
import { ScrollArea } from "../ui/scroll-area";
import { useStore } from "@tanstack/react-store";
import { BoardViewStore } from "./board-view-store";

type TaskViewProps = {
  tasks: TaskWithRelations[];
  projectId: string;
  statuses: Status[];
  priorityOrder: Priority[];
  updateTask: (task: UpdateTask) => Promise<void>;
};

export const BoardView = ({
  tasks,
  projectId,
  statuses,
  priorityOrder,
  updateTask,
}: TaskViewProps) => {
  const [activeTask, setActiveTask] = useState<TaskWithRelations | null>(null);

  const handleDrop = (e: DragEndEvent) => {
    setActiveTask(null);
    const taskId = (e.active.id as string).split(":")[1];
    const statusId = (e.over?.id as string).split(":")[1];
    const task = tasks.find((t) => t.id === taskId);
    if (!task || !statusId || !task.projectId) return;
    updateTask({
      id: taskId,
      statusId,
      projectId: task.projectId,
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
  }, {} as Record<string, TaskWithRelations[]>);

  const sortBy = useStore(BoardViewStore, (state) => state.sortBy);
  const sortDirection = useStore(
    BoardViewStore,
    (state) => state.sortDirection
  );
  const taskComparator = (): ((
    a: TaskWithRelations,
    b: TaskWithRelations
  ) => number) => {
    const directionMultiplier = sortDirection === "asc" ? 1 : -1;

    switch (sortBy) {
      case "due":
        return (a, b) =>
          directionMultiplier *
          ((a.deadline?.getTime() || 0) - (b.deadline?.getTime() || 0));
      case "created":
        return (a, b) =>
          directionMultiplier * (a.createdAt.getTime() - b.createdAt.getTime());
      case "updated":
        return (a, b) =>
          directionMultiplier * (a.updatedAt.getTime() - b.updatedAt.getTime());
      default:
        return () => 0; // No sorting
    }
  };

  return (
    <DndContext
      onDragEnd={handleDrop}
      sensors={sensors}
      onDragStart={(event) => {
        const taskId = (event.active.id as string).split(":")[1];
        const task = tasks.find((t) => t.id === taskId);
        if (task) setActiveTask(task);
      }}
    >
      {/* Setting the height to 1px is a hack to make flex-grow work */}
      {/* Without some kind of concrete height, the flex-grow doesn't work */}
      {/* Doesn't really matter what the height is, as long as it's not a percentage */}
      {/* TODO: It could make sense to set a fixed height on the view container */}
      <div className="h-px grow pb-3">
        <div className="flex gap-3 h-full">
          {tasksByStatus["unassigned"] ? (
            <TaskColumn
              projectId={projectId}
              key="unassigned"
              numberOfTasks={tasksByStatus["unassigned"]?.length || 0}
            >
              {[...tasksByStatus["unassigned"]]
                .sort(
                  (a, b) =>
                    priorityOrder.indexOf(b.priority) -
                    priorityOrder.indexOf(a.priority)
                )
                .sort(taskComparator())
                .map((task) => {
                  return <TaskCard key={task.id} task={task} />;
                })}
            </TaskColumn>
          ) : null}
          {[...statuses].map((status) => {
            return (
              <TaskColumn
                projectId={projectId}
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
                      .sort(taskComparator())
                      .map((task) => {
                        return <TaskCard key={task.id} task={task} />;
                      })
                  : null}
              </TaskColumn>
            );
          })}
          <div className="min-w-3 h-px"></div>
        </div>
      </div>
      <DragOverlay dropAnimation={null}>
        {activeTask && <TaskCardComponent task={activeTask} />}
      </DragOverlay>
    </DndContext>
  );
};
