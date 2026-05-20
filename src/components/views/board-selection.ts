import { BoardViewStore } from "./board-view-store";

function isEditableTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  return (
    tag === "INPUT" ||
    tag === "TEXTAREA" ||
    tag === "SELECT" ||
    target.isContentEditable
  );
}

export function setHoveredTaskId(id: string | null) {
  BoardViewStore.setState((state) => ({ ...state, hoveredTaskId: id }));
}

export function clearTaskSelectionState() {
  BoardViewStore.setState((state) => ({
    ...state,
    selectedTaskIds: [],
    selectionAnchorId: null,
  }));
}

export function selectAllTaskIds(taskIds: string[]) {
  BoardViewStore.setState((state) => ({
    ...state,
    selectedTaskIds: taskIds,
    selectionAnchorId: taskIds[0] ?? null,
  }));
}

export function toggleHoveredTaskSelection() {
  const { hoveredTaskId, selectedTaskIds } = BoardViewStore.state;
  if (!hoveredTaskId) return;

  if (selectedTaskIds.includes(hoveredTaskId)) {
    BoardViewStore.setState((state) => ({
      ...state,
      selectedTaskIds: state.selectedTaskIds.filter(
        (id) => id !== hoveredTaskId
      ),
      selectionAnchorId:
        state.selectionAnchorId === hoveredTaskId
          ? state.selectedTaskIds.find((id) => id !== hoveredTaskId) ?? null
          : state.selectionAnchorId,
    }));
  } else {
    BoardViewStore.setState((state) => ({
      ...state,
      selectedTaskIds: [...state.selectedTaskIds, hoveredTaskId],
      selectionAnchorId: state.selectionAnchorId ?? hoveredTaskId,
    }));
  }
}

export function handleTaskCardSelectClick(
  taskId: string,
  columnTaskIds: string[],
  event: { shiftKey: boolean; metaKey: boolean; ctrlKey: boolean }
) {
  const modifierKey = event.metaKey || event.ctrlKey;

  if (event.shiftKey) {
    const state = BoardViewStore.state;
    const anchor =
      state.selectionAnchorId ?? state.selectedTaskIds[0] ?? taskId;
    const anchorIndex = columnTaskIds.indexOf(anchor);
    const targetIndex = columnTaskIds.indexOf(taskId);

    if (anchorIndex === -1 || targetIndex === -1) {
      BoardViewStore.setState((s) => ({
        ...s,
        selectedTaskIds: [...new Set([...s.selectedTaskIds, taskId])],
        selectionAnchorId: taskId,
      }));
      return;
    }

    const [start, end] =
      anchorIndex < targetIndex
        ? [anchorIndex, targetIndex]
        : [targetIndex, anchorIndex];
    const rangeIds = columnTaskIds.slice(start, end + 1);

    BoardViewStore.setState((s) => ({
      ...s,
      selectedTaskIds: [...new Set([...s.selectedTaskIds, ...rangeIds])],
      selectionAnchorId: anchor,
    }));
    return;
  }

  if (modifierKey) {
    const state = BoardViewStore.state;
    const isSelected = state.selectedTaskIds.includes(taskId);
    const selectedTaskIds = isSelected
      ? state.selectedTaskIds.filter((id) => id !== taskId)
      : [...state.selectedTaskIds, taskId];

    BoardViewStore.setState((s) => ({
      ...s,
      selectedTaskIds,
      selectionAnchorId: isSelected
        ? s.selectionAnchorId === taskId
          ? selectedTaskIds[0] ?? null
          : s.selectionAnchorId
        : taskId,
    }));
    return;
  }

  if (BoardViewStore.state.selectedTaskIds.length > 0) {
    clearTaskSelectionState();
  }
}

export function registerBoardSelectionKeyboard(
  getAllTaskIds: () => string[]
): () => void {
  const handleKeyDown = (event: KeyboardEvent) => {
    if (isEditableTarget(event.target)) return;

    if (event.key === "Escape") {
      clearTaskSelectionState();
      return;
    }

    if (event.key === "x" || event.key === "X") {
      event.preventDefault();
      toggleHoveredTaskSelection();
      return;
    }

    if ((event.metaKey || event.ctrlKey) && event.key === "a") {
      event.preventDefault();
      selectAllTaskIds(getAllTaskIds());
    }
  };

  window.addEventListener("keydown", handleKeyDown);
  return () => window.removeEventListener("keydown", handleKeyDown);
}
