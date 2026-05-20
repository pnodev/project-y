import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { useEffect, useMemo, useState } from "react";
import TaskCard, { TaskCardComponent } from "~/components/TaskCard";
import TaskColumn from "~/components/TaskColumn";
import { Label, Priority, Status, TaskWithRelations, UpdateTask } from "~/db/schema";
import { useStore } from "@tanstack/react-store";
import { BoardViewStore } from "./board-view-store";
import { registerBoardSelectionKeyboard } from "./board-selection";
import { BatchTaskToolbar } from "~/components/BatchTaskToolbar";
import { cn } from "~/lib/utils";

type TaskViewProps = {
  tasks: TaskWithRelations[];
  projectId?: string;
  sprintId?: string;
  statuses: Status[];
  labels: Label[];
  location: "project" | "sprint" | "all";
  updateTask: (task: UpdateTask) => Promise<void>;
};

export const BoardView = ({
  tasks,
  projectId,
  sprintId,
  statuses,
  labels,
  location,
  updateTask,
}: TaskViewProps) => {
  const priorityOrder: Priority[] = ["low", "medium", "high", "critical"];
  const [activeTask, setActiveTask] = useState<TaskWithRelations | null>(null);
  const selectedTaskIds = useStore(
    BoardViewStore,
    (state) => state.selectedTaskIds
  );

  const selectedTasks = useMemo(
    () => tasks.filter((t) => selectedTaskIds.includes(t.id)),
    [tasks, selectedTaskIds]
  );

  useEffect(
    () => registerBoardSelectionKeyboard(() => tasks.map((t) => t.id)),
    [tasks]
  );

  const handleDrop = (e: DragEndEvent) => {
    setActiveTask(null);
    const taskId = (e.active.id as string).split(":")[1];
    const statusId = (e.over?.id as string).split(":")[1];
    const task = tasks.find((t) => t.id === taskId);
    if (!task || !statusId || !task.projectId) return;
    void updateTask({
      id: taskId,
      statusId,
      projectId: task.projectId,
      sprintId: task.sprintId ?? undefined,
    }).catch(() => undefined);
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
      [status.id]: [...(acc[status.id] || []), task].sort(
        (a, b) => a.createdAt.getTime() - b.createdAt.getTime()
      ),
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

  const sortColumnTasks = (columnTasks: TaskWithRelations[]) => {
    return [...columnTasks]
      .sort(
        (a, b) =>
          priorityOrder.indexOf(b.priority) - priorityOrder.indexOf(a.priority)
      )
      .sort(taskComparator());
  };

  const showProject = location === "sprint" || location === "all";
  const showSprint = location === "project" || location === "all";
  const taskLinkTo =
    location === "all" ? ("all" as const) : undefined;

  const renderColumnCards = (columnTasks: TaskWithRelations[]) => {
    const sorted = sortColumnTasks(columnTasks);
    const columnTaskIds = sorted.map((t) => t.id);
    return sorted.map((task) => (
      <TaskCard
        key={task.id}
        task={task}
        columnTaskIds={columnTaskIds}
        showSprint={showSprint}
        showProject={showProject}
        taskLinkTo={taskLinkTo}
      />
    ));
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
      <div className="flex flex-col gap-2 h-full min-h-0">
        {selectedTasks.length > 0 ? (
          <BatchTaskToolbar
            selectedTasks={selectedTasks}
            statuses={statuses}
            labels={labels}
            location={location}
          />
        ) : null}
        {/* Setting the height to 1px is a hack to make flex-grow work */}
        <div
          className={cn(
            "h-px grow min-h-0",
            selectedTasks.length > 0 ? "pb-16" : "pb-3"
          )}
        >
          <div className="flex gap-3 h-full">
            {tasksByStatus["unassigned"] ? (
              <TaskColumn
                projectId={projectId}
                sprintId={sprintId}
                key="unassigned"
                numberOfTasks={tasksByStatus["unassigned"]?.length || 0}
              >
                {renderColumnCards(tasksByStatus["unassigned"])}
              </TaskColumn>
            ) : null}
            {[...statuses].map((status) => {
              return (
                <TaskColumn
                  projectId={projectId}
                  sprintId={sprintId}
                  key={status.id}
                  status={status}
                  numberOfTasks={tasksByStatus[status.id]?.length || 0}
                >
                  {tasksByStatus[status.id]
                    ? renderColumnCards(tasksByStatus[status.id])
                    : null}
                </TaskColumn>
              );
            })}
            <div className="min-w-3 h-px"></div>
          </div>
        </div>
      </div>
      <DragOverlay dropAnimation={null}>
        {activeTask && (
          <TaskCardComponent
            task={activeTask}
            showSprint={showSprint}
            showProject={showProject}
            taskLinkTo={taskLinkTo}
          />
        )}
      </DragOverlay>
    </DndContext>
  );
};
