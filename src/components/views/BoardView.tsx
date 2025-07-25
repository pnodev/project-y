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
      <div className="flex overflow-x-auto gap-3 h-px grow">
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
              .sort(
                (a, b) =>
                  (a.deadline?.getTime() || 0) - (b.deadline?.getTime() || 0)
              )
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
                    .sort(
                      (a, b) =>
                        (a.deadline?.getTime() || 0) -
                        (b.deadline?.getTime() || 0)
                    )
                    .map((task) => {
                      return <TaskCard key={task.id} task={task} />;
                    })
                : null}
            </TaskColumn>
          );
        })}
      </div>
      <DragOverlay dropAnimation={null}>
        {activeTask && <TaskCardComponent task={activeTask} />}
      </DragOverlay>
    </DndContext>
  );
};
