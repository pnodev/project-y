import type { Priority, TaskWithRelations } from "~/db/schema";
import type { SortByType } from "./task-view-store";

const priorityOrder: Priority[] = ["low", "medium", "high", "critical"];

export function createTaskComparator(
  sortBy: SortByType,
  sortDirection: "asc" | "desc"
): (a: TaskWithRelations, b: TaskWithRelations) => number {
  const directionMultiplier = sortDirection === "asc" ? 1 : -1;

  switch (sortBy) {
    case "due":
      return (a, b) =>
        directionMultiplier *
        ((a.deadline?.getTime() || 0) - (b.deadline?.getTime() || 0));
    case "created":
      return (a, b) =>
        directionMultiplier * (a.createdAt.getTime() - b.createdAt.getTime());
    case "updated":
      return (a, b) =>
        directionMultiplier * (a.updatedAt.getTime() - b.updatedAt.getTime());
    default:
      return () => 0;
  }
}

export function sortTasks(
  tasks: TaskWithRelations[],
  sortBy: SortByType,
  sortDirection: "asc" | "desc"
): TaskWithRelations[] {
  const comparator = createTaskComparator(sortBy, sortDirection);
  return [...tasks]
    .sort(
      (a, b) =>
        priorityOrder.indexOf(b.priority) - priorityOrder.indexOf(a.priority)
    )
    .sort(comparator);
}
