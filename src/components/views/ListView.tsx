import { useMemo } from "react";
import { useStore } from "@tanstack/react-store";
import { PlusIcon } from "lucide-react";
import TaskQuickCreate from "~/components/TaskQuickCreate";
import { Button } from "~/components/ui/button";
import { ScrollArea } from "~/components/ui/scroll-area";
import { cn } from "~/lib/utils";
import type { Status } from "~/db/schema";
import { TaskListRow } from "./TaskListRow";
import { groupTasksByStatus } from "./task-view-grouping";
import { sortTasks } from "./task-sort";
import { TaskViewStore } from "./task-view-store";
import type { TaskViewProps } from "./task-view-types";

const colorClassesColumnBackground = {
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
  neutral: "bg-neutral-500",
};

export function ListView({
  tasks,
  projectId,
  sprintId,
  statuses,
  location,
  updateTask,
}: TaskViewProps) {
  const sortBy = useStore(TaskViewStore, (state) => state.sortBy);
  const sortDirection = useStore(
    TaskViewStore,
    (state) => state.sortDirection
  );

  const showProject = location === "sprint" || location === "all";
  const showSprint = location === "project" || location === "all";

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

  return (
    <ScrollArea className="h-full min-h-0">
      <div className="flex flex-col gap-6 pb-3 pr-3">
        {sectionsWithSortedTasks.map((section) => (
          <ListSection
            key={section.key}
            section={section}
            sortedTasks={section.sortedTasks}
            statuses={statuses}
            orderedTaskIds={orderedTaskIds}
            location={location}
            showProject={showProject}
            showSprint={showSprint}
            projectId={projectId}
            sprintId={sprintId}
            updateTask={updateTask}
          />
        ))}
      </div>
    </ScrollArea>
  );
}

function sectionTitle(section: ReturnType<typeof groupTasksByStatus>[number]) {
  if (section.status) return section.status.name;
  if (section.key.startsWith("unknown-")) return "Unknown status";
  return "Unassigned";
}

function ListSection({
  section,
  sortedTasks,
  statuses,
  orderedTaskIds,
  location,
  showProject,
  showSprint,
  projectId,
  sprintId,
  updateTask,
}: {
  section: ReturnType<typeof groupTasksByStatus>[number];
  sortedTasks: TaskViewProps["tasks"];
  statuses: Status[];
  orderedTaskIds: string[];
  location: TaskViewProps["location"];
  showProject: boolean;
  showSprint: boolean;
  projectId?: string;
  sprintId?: string;
  updateTask: TaskViewProps["updateTask"];
}) {
  const status = section.status;
  const isUnknown = section.key.startsWith("unknown-");

  if (sortedTasks.length === 0 && !status && !isUnknown) {
    return null;
  }

  return (
    <section className="flex flex-col gap-2">
      <div className="flex items-center justify-between gap-2">
        <h2
          className={cn(
            "flex items-center gap-2 text-sm font-semibold",
            !status && "text-yellow-900"
          )}
        >
          <span
            className={cn(
              "size-2.5 shrink-0 rounded-full",
              colorClassesColumnBackground[
                (status?.color || "neutral") as keyof typeof colorClassesColumnBackground
              ]
            )}
          />
          {sectionTitle(section)}
          <span className="text-xs font-normal text-muted-foreground">
            ({sortedTasks.length})
          </span>
        </h2>
        {status ? (
          <div className="flex items-center gap-2">
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
              variant="outline"
              type="button"
              onClick={() =>
                TaskViewStore.setState((state) => ({
                  ...state,
                  quickCreateOpenFor: status.id,
                }))
              }
            >
              <PlusIcon />
              Add Task
            </Button>
          </div>
        ) : null}
      </div>
      {sortedTasks.length > 0 ? (
        <div className="overflow-x-auto rounded-md border">
          <table className="w-full min-w-[800px] border-collapse text-sm">
            <thead className="sticky top-0 z-10 bg-muted/80 backdrop-blur-sm">
              <tr className="border-b text-left text-xs text-muted-foreground">
                <th className="w-10 px-2 py-2" />
                <th className="min-w-[200px] px-2 py-2 font-medium">Title</th>
                <th className="w-36 px-2 py-2 font-medium">Status</th>
                <th className="w-32 px-2 py-2 font-medium">Priority</th>
                <th className="w-28 px-2 py-2 font-medium">Due</th>
                <th className="w-28 px-2 py-2 font-medium">Assignees</th>
                <th className="min-w-[120px] px-2 py-2 font-medium">Labels</th>
                {showProject ? (
                  <th className="w-36 px-2 py-2 font-medium">Project</th>
                ) : null}
                {showSprint ? (
                  <th className="w-32 px-2 py-2 font-medium">Sprint</th>
                ) : null}
              </tr>
            </thead>
            <tbody>
              {sortedTasks.map((task) => (
                <TaskListRow
                  key={task.id}
                  task={task}
                  orderedTaskIds={orderedTaskIds}
                  statuses={statuses}
                  location={location}
                  showProject={showProject}
                  showSprint={showSprint}
                  updateTask={updateTask}
                />
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </section>
  );
}
