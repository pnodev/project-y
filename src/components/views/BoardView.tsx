import { DndContext, DragOverlay } from "@dnd-kit/core";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { fetchTaskGitSummaries } from "~/db/queries/git";
import TaskCard, { TaskCardComponent } from "~/components/TaskCard";
import TaskColumn from "~/components/TaskColumn";
import { useStore } from "@tanstack/react-store";
import { sortTasks } from "./task-sort";
import {
  useTaskViewSensors,
  handleTaskStatusDrop,
} from "./task-view-dnd";
import { TaskViewStore } from "./task-view-store";
import type { TaskViewProps } from "./task-view-types";
import { getClosingStatusId } from "~/lib/statuses";

export const BoardView = ({
  tasks,
  projectId,
  sprintId,
  statuses,
  location,
  updateTask,
}: TaskViewProps) => {
  const [activeTask, setActiveTask] = useState(
    () => null as TaskViewProps["tasks"][number] | null
  );

  const sortBy = useStore(TaskViewStore, (state) => state.sortBy);
  const sortDirection = useStore(
    TaskViewStore,
    (state) => state.sortDirection
  );

  const sensors = useTaskViewSensors();

  const taskIds = useMemo(() => tasks.map((t) => t.id), [tasks]);
  const { data: gitSummaries } = useQuery({
    queryKey: ["git", "summaries", taskIds],
    queryFn: () => fetchTaskGitSummaries({ data: { taskIds } }),
    enabled: taskIds.length > 0,
  });

  const tasksByStatus = useMemo(() => {
    return tasks.reduce(
      (acc, task) => {
        if (!task.statusId) {
          return {
            ...acc,
            unassigned: [...(acc.unassigned || []), task],
          };
        }

        const status = statuses.find((s) => s.id === task.statusId);
        if (!status) return acc;

        return {
          ...acc,
          [status.id]: [...(acc[status.id] || []), task],
        };
      },
      {} as Record<string, TaskViewProps["tasks"]>
    );
  }, [tasks, statuses]);

  const sortColumnTasks = (columnTasks: TaskViewProps["tasks"]) =>
    sortTasks(columnTasks, sortBy, sortDirection);

  const showProject = location === "sprint" || location === "all";
  const showSprint = location === "project" || location === "all";
  const taskLinkTo = location === "all" ? ("all" as const) : undefined;
  const closingStatusId = getClosingStatusId(statuses);

  const renderColumnCards = (columnTasks: TaskViewProps["tasks"]) => {
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
        gitSummary={gitSummaries?.[task.id]}
        closingStatusId={closingStatusId}
      />
    ));
  };

  return (
    <DndContext
      onDragEnd={(event) => {
        setActiveTask(null);
        handleTaskStatusDrop(event, tasks, updateTask);
      }}
      onDragCancel={() => setActiveTask(null)}
      sensors={sensors}
      onDragStart={(event) => {
        const taskId = (event.active.id as string).split(":")[1];
        const task = tasks.find((t) => t.id === taskId);
        if (task) setActiveTask(task);
      }}
    >
      <div className="flex gap-3 h-full overflow-x-auto pb-1">
        {tasksByStatus["unassigned"]?.length ? (
          <TaskColumn
            projectId={projectId}
            sprintId={sprintId}
            key="unassigned"
            numberOfTasks={tasksByStatus["unassigned"]?.length || 0}
          >
            {renderColumnCards(tasksByStatus["unassigned"])}
          </TaskColumn>
        ) : null}
        {[...statuses].map((status) => (
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
        ))}
        <div className="min-w-3 h-px shrink-0" />
      </div>
      <DragOverlay dropAnimation={null}>
        {activeTask ? (
          <TaskCardComponent
            task={activeTask}
            showSprint={showSprint}
            showProject={showProject}
            taskLinkTo={taskLinkTo}
            closingStatusId={closingStatusId}
          />
        ) : null}
      </DragOverlay>
    </DndContext>
  );
};
