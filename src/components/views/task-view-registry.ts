import { BoardView } from "./BoardView";
import { ListView } from "./ListView";
import type { TaskViewComponent } from "./task-view-types";
import type { TaskViewMode } from "~/db/schema";

export const TASK_VIEW_REGISTRY: Record<TaskViewMode, TaskViewComponent> = {
  board: BoardView,
  list: ListView,
};
