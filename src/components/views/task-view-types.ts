import type { ComponentType } from "react";
import type {
  Label,
  Status,
  TaskViewMode,
  TaskWithRelations,
  UpdateTask,
} from "~/db/schema";

export type TaskViewLocation = "project" | "sprint" | "all";

export type TaskViewProps = {
  tasks: TaskWithRelations[];
  projectId?: string;
  sprintId?: string;
  statuses: Status[];
  labels: Label[];
  location: TaskViewLocation;
  updateTask: (task: UpdateTask) => Promise<void>;
};

export type TaskViewComponent = ComponentType<TaskViewProps>;

export { type TaskViewMode };
