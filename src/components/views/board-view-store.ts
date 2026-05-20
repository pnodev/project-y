import { Store } from "@tanstack/react-store";

export type SortByType = "due" | "created" | "updated";
type BoardViewState = {
  quickCreateOpenFor: null | string;
  sortBy: SortByType;
  sortDirection: "asc" | "desc";
  selectedTaskIds: string[];
  selectionAnchorId: string | null;
  hoveredTaskId: string | null;
};

export const BoardViewStore = new Store<BoardViewState>({
  quickCreateOpenFor: null,
  sortBy: "due",
  sortDirection: "desc",
  selectedTaskIds: [],
  selectionAnchorId: null,
  hoveredTaskId: null,
});

export function toggleTaskId(id: string) {
  BoardViewStore.setState((state) => {
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
  BoardViewStore.setState((state) => ({
    ...state,
    selectedTaskIds: [],
    selectionAnchorId: null,
  }));
}

export function setSelectedTaskIds(ids: string[]) {
  BoardViewStore.setState((state) => ({
    ...state,
    selectedTaskIds: ids,
    selectionAnchorId: ids[0] ?? null,
  }));
}
