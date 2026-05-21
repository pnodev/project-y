import { useEffect, useMemo } from "react";
import { useStore } from "@tanstack/react-store";
import { BatchTaskToolbar } from "~/components/BatchTaskToolbar";
import { cn } from "~/lib/utils";
import {
  flattenSectionTaskIds,
  groupTasksByStatus,
} from "./task-view-grouping";
import { registerTaskSelectionKeyboard } from "./task-selection";
import { sortTasks } from "./task-sort";
import { TASK_VIEW_REGISTRY } from "./task-view-registry";
import type { TaskViewProps } from "./task-view-types";
import { TaskViewStore } from "./task-view-store";
import { useSyncTaskViewModeFromPreferences } from "./use-sync-task-view-mode";

export function TaskViewsContainer(props: TaskViewProps) {
  useSyncTaskViewModeFromPreferences();

  const viewMode = useStore(TaskViewStore, (state) => state.viewMode);
  const sortBy = useStore(TaskViewStore, (state) => state.sortBy);
  const sortDirection = useStore(
    TaskViewStore,
    (state) => state.sortDirection
  );
  const selectedTaskIds = useStore(
    TaskViewStore,
    (state) => state.selectedTaskIds
  );

  const selectedIdSet = useMemo(
    () => new Set(selectedTaskIds),
    [selectedTaskIds]
  );

  const selectedTasks = useMemo(
    () => props.tasks.filter((t) => selectedIdSet.has(t.id)),
    [props.tasks, selectedIdSet]
  );

  const flatTaskIds = useMemo(() => {
    const sections = groupTasksByStatus(props.tasks, props.statuses);
    return flattenSectionTaskIds(sections, (columnTasks) =>
      sortTasks(columnTasks, sortBy, sortDirection)
    );
  }, [props.tasks, props.statuses, sortBy, sortDirection]);

  useEffect(
    () => registerTaskSelectionKeyboard(() => flatTaskIds),
    [flatTaskIds]
  );

  const ViewComponent = TASK_VIEW_REGISTRY[viewMode];

  return (
    <div className="flex flex-col gap-2 h-full min-h-0">
      {selectedTasks.length > 0 ? (
        <BatchTaskToolbar
          selectedTasks={selectedTasks}
          statuses={props.statuses}
          labels={props.labels}
          location={props.location}
        />
      ) : null}
      <div
        className={cn(
          "h-px grow min-h-0",
          selectedTasks.length > 0 ? "pb-16" : "pb-3"
        )}
      >
        <ViewComponent {...props} />
      </div>
    </div>
  );
}
