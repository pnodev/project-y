import { TaskViewStore } from "./task-view-store";

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
  TaskViewStore.setState((state) => ({ ...state, hoveredTaskId: id }));
}

export function clearTaskSelectionState() {
  TaskViewStore.setState((state) => ({
    ...state,
    selectedTaskIds: [],
    selectionAnchorId: null,
  }));
}

export function selectAllTaskIds(taskIds: string[]) {
  TaskViewStore.setState((state) => ({
    ...state,
    selectedTaskIds: taskIds,
    selectionAnchorId: taskIds[0] ?? null,
  }));
}

export function toggleHoveredTaskSelection() {
  const { hoveredTaskId, selectedTaskIds } = TaskViewStore.state;
  if (!hoveredTaskId) return;

  if (selectedTaskIds.includes(hoveredTaskId)) {
    TaskViewStore.setState((state) => ({
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
    TaskViewStore.setState((state) => ({
      ...state,
      selectedTaskIds: [...state.selectedTaskIds, hoveredTaskId],
      selectionAnchorId: state.selectionAnchorId ?? hoveredTaskId,
    }));
  }
}

export function shouldIgnoreRowSelectClick(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return true;
  return Boolean(target.closest("[data-row-select-ignore]"));
}

export function handleTaskSelectClick(
  taskId: string,
  orderedTaskIds: string[],
  event: { shiftKey: boolean; metaKey: boolean; ctrlKey: boolean }
) {
  const modifierKey = event.metaKey || event.ctrlKey;

  if (event.shiftKey) {
    const state = TaskViewStore.state;
    const anchor =
      state.selectionAnchorId ?? state.selectedTaskIds[0] ?? taskId;
    const anchorIndex = orderedTaskIds.indexOf(anchor);
    const targetIndex = orderedTaskIds.indexOf(taskId);

    if (anchorIndex === -1 || targetIndex === -1) {
      TaskViewStore.setState((s) => ({
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
    const rangeIds = orderedTaskIds.slice(start, end + 1);

    TaskViewStore.setState((s) => ({
      ...s,
      selectedTaskIds: [...new Set([...s.selectedTaskIds, ...rangeIds])],
      selectionAnchorId: anchor,
    }));
    return;
  }

  if (modifierKey) {
    const state = TaskViewStore.state;
    const isSelected = state.selectedTaskIds.includes(taskId);
    const selectedTaskIds = isSelected
      ? state.selectedTaskIds.filter((id) => id !== taskId)
      : [...state.selectedTaskIds, taskId];

    TaskViewStore.setState((s) => ({
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

  if (TaskViewStore.state.selectedTaskIds.length > 0) {
    clearTaskSelectionState();
  }
}

/** @deprecated Use handleTaskSelectClick */
export const handleTaskCardSelectClick = handleTaskSelectClick;

export function registerTaskSelectionKeyboard(
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

/** @deprecated Use registerTaskSelectionKeyboard */
export const registerBoardSelectionKeyboard = registerTaskSelectionKeyboard;
