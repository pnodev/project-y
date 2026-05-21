import { Store } from "@tanstack/react-store";
import type { TaskViewMode } from "~/db/schema";

export type SortByType = "due" | "created" | "updated";

type TaskViewState = {
  viewMode: TaskViewMode;
  quickCreateOpenFor: null | string;
  sortBy: SortByType;
  sortDirection: "asc" | "desc";
  selectedTaskIds: string[];
  selectionAnchorId: string | null;
  hoveredTaskId: string | null;
};

export const TaskViewStore = new Store<TaskViewState>({
  viewMode: "board",
  quickCreateOpenFor: null,
  sortBy: "due",
  sortDirection: "desc",
  selectedTaskIds: [],
  selectionAnchorId: null,
  hoveredTaskId: null,
});

export function toggleTaskId(id: string) {
  TaskViewStore.setState((state) => {
    const isSelected = state.selectedTaskIds.includes(id);
    const selectedTaskIds = isSelected
      ? state.selectedTaskIds.filter((taskId) => taskId !== id)
      : [...state.selectedTaskIds, id];
    return {
      ...state,
      selectedTaskIds,
      selectionAnchorId: isSelected
        ? state.selectionAnchorId === id
          ? selectedTaskIds[0] ?? null
          : state.selectionAnchorId
        : id,
    };
  });
}

export function clearTaskSelection() {
  TaskViewStore.setState((state) => ({
    ...state,
    selectedTaskIds: [],
    selectionAnchorId: null,
  }));
}

export function setSelectedTaskIds(ids: string[]) {
  TaskViewStore.setState((state) => ({
    ...state,
    selectedTaskIds: ids,
    selectionAnchorId: ids[0] ?? null,
  }));
}
