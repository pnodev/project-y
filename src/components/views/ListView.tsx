import {
  DndContext,
  DragOverlay,
  useDroppable,
} from "@dnd-kit/core";
import { useMemo, useState } from "react";
import { useStore } from "@tanstack/react-store";
import { PlusIcon } from "lucide-react";
import TaskQuickCreate from "~/components/TaskQuickCreate";
import { Button } from "~/components/ui/button";
import { ScrollArea } from "~/components/ui/scroll-area";
import { cn } from "~/lib/utils";
import type { TaskWithRelations } from "~/db/schema";
import { ListColumnHeader } from "./ListColumnHeader";
import { TaskListRow } from "./TaskListRow";
import type { ListColumnFlags } from "./list-view-layout";
import { groupTasksByStatus, type TaskStatusSection } from "./task-view-grouping";
import { sortTasks } from "./task-sort";
import {
  useTaskViewSensors,
  getStatusDropId,
  handleTaskStatusDrop,
} from "./task-view-dnd";
import { TaskViewStore } from "./task-view-store";
import type { TaskViewProps } from "./task-view-types";

const statusDotClass = {
  red: "bg-red-500",
  orange: "bg-orange-500",
  yellow: "bg-yellow-500",
  green: "bg-green-500",
  emerald: "bg-emerald-500",
  teal: "bg-teal-500",
  cyan: "bg-cyan-500",
  blue: "bg-blue-500",
  indigo: "bg-indigo-500",
  violet: "bg-violet-500",
  purple: "bg-purple-500",
  fuchsia: "bg-fuchsia-500",
  pink: "bg-pink-500",
  rose: "bg-rose-500",
  neutral: "bg-neutral-400",
} as const;

export function ListView({
  tasks,
  projectId,
  sprintId,
  statuses,
  location,
  updateTask,
}: TaskViewProps) {
  const [activeTask, setActiveTask] = useState<TaskWithRelations | null>(null);
  const sensors = useTaskViewSensors();

  const sortBy = useStore(TaskViewStore, (state) => state.sortBy);
  const sortDirection = useStore(
    TaskViewStore,
    (state) => state.sortDirection
  );

  const columnFlags: ListColumnFlags = {
    showProject: location === "sprint" || location === "all",
    showSprint: location === "project" || location === "all",
  };

  const sectionsWithSortedTasks = useMemo(() => {
    return groupTasksByStatus(tasks, statuses).map((section) => ({
      ...section,
      sortedTasks: sortTasks(section.tasks, sortBy, sortDirection),
    }));
  }, [tasks, statuses, sortBy, sortDirection]);

  const orderedTaskIds = useMemo(
    () => sectionsWithSortedTasks.flatMap((s) => s.sortedTasks.map((t) => t.id)),
    [sectionsWithSortedTasks]
  );

  const visibleSections = sectionsWithSortedTasks.filter((section) => {
    const isUnknown = section.key.startsWith("unknown-");
    return section.sortedTasks.length > 0 || section.status || isUnknown;
  });

  return (
    <DndContext
      sensors={sensors}
      onDragStart={(event) => {
        const taskId = String(event.active.id).split(":")[1];
        const task = tasks.find((t) => t.id === taskId);
        if (task) setActiveTask(task);
      }}
      onDragEnd={(event) => {
        setActiveTask(null);
        handleTaskStatusDrop(event, tasks, updateTask);
      }}
    >
      <ScrollArea className="h-full min-h-0">
        <div className="pb-3 pr-2">
          <div className="overflow-hidden rounded-lg border border-border/50 bg-background">
            <ListColumnHeader flags={columnFlags} />
            {visibleSections.map((section, index) => (
              <ListSection
                key={section.key}
                section={section}
                sortedTasks={section.sortedTasks}
                orderedTaskIds={orderedTaskIds}
                columnFlags={columnFlags}
                location={location}
                projectId={projectId}
                sprintId={sprintId}
                updateTask={updateTask}
                isFirst={index === 0}
              />
            ))}
          </div>
        </div>
      </ScrollArea>
      <DragOverlay dropAnimation={null}>
        {activeTask ? (
          <div className="min-w-[800px]">
            <TaskListRow
              task={activeTask}
              orderedTaskIds={orderedTaskIds}
              columnFlags={columnFlags}
              location={location}
              updateTask={updateTask}
              isOverlay
            />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}

function sectionTitle(section: TaskStatusSection) {
  if (section.status) return section.status.name;
  if (section.key.startsWith("unknown-")) return "Unknown status";
  return "Unassigned";
}

function ListSection({
  section,
  sortedTasks,
  orderedTaskIds,
  columnFlags,
  location,
  projectId,
  sprintId,
  updateTask,
  isFirst,
}: {
  section: TaskStatusSection;
  sortedTasks: TaskViewProps["tasks"];
  orderedTaskIds: string[];
  columnFlags: ListColumnFlags;
  location: TaskViewProps["location"];
  projectId?: string;
  sprintId?: string;
  updateTask: TaskViewProps["updateTask"];
  isFirst: boolean;
}) {
  const status = section.status;
  const isUnknown = section.key.startsWith("unknown-");
  const dropId = getStatusDropId(section);
  const { isOver, setNodeRef } = useDroppable({ id: dropId });

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "transition-colors",
        isOver && "bg-primary/[0.03]",
        !isFirst && "border-t border-border/40"
      )}
    >
      <div className="flex items-center justify-between gap-3 px-4 py-2">
        <div
          className={cn(
            "flex items-center gap-2 text-sm font-medium text-foreground",
            !status && !isUnknown && "text-yellow-900/90"
          )}
        >
          <span
            className={cn(
              "size-2 shrink-0 rounded-full",
              statusDotClass[(status?.color || "neutral") as keyof typeof statusDotClass]
            )}
          />
          {sectionTitle(section)}
          <span className="font-normal text-muted-foreground">
            {sortedTasks.length}
          </span>
        </div>
        {status ? (
          <div className="flex items-center gap-1">
            <TaskQuickCreate
              status={status.id}
              projectId={projectId}
              sprintId={sprintId}
              onClose={() =>
                TaskViewStore.setState((state) => ({
                  ...state,
                  quickCreateOpenFor: null,
                }))
              }
            />
            <Button
              size="sm"
              variant="ghost"
              type="button"
              className="h-8 gap-1 text-xs text-muted-foreground hover:text-foreground"
              onClick={() =>
                TaskViewStore.setState((state) => ({
                  ...state,
                  quickCreateOpenFor: status.id,
                }))
              }
            >
              <PlusIcon className="size-3.5" />
              Add task
            </Button>
          </div>
        ) : null}
      </div>

      {sortedTasks.length > 0 ? (
        sortedTasks.map((task) => (
          <TaskListRow
            key={task.id}
            task={task}
            orderedTaskIds={orderedTaskIds}
            location={location}
            columnFlags={columnFlags}
            updateTask={updateTask}
          />
        ))
      ) : (
        <p className="px-4 py-6 text-center text-xs text-muted-foreground/60">
          Drop tasks here
        </p>
      )}
    </div>
  );
}
