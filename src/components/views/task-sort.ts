import type { Priority, TaskWithRelations } from "~/db/schema";
import type { SortByType } from "./task-view-store";

const priorityOrder: Priority[] = ["low", "medium", "high", "critical"];

function toTimestamp(
  value: Date | string | null | undefined
): number | null {
  if (value == null) return null;
  if (value instanceof Date) {
    const time = value.getTime();
    return Number.isNaN(time) ? null : time;
  }
  const time = new Date(value).getTime();
  return Number.isNaN(time) ? null : time;
}

function compareNullableTimestamps(
  a: number | null,
  b: number | null,
  sortDirection: "asc" | "desc"
): number {
  const nullSentinel = sortDirection === "asc" ? Infinity : -Infinity;
  const aValue = a ?? nullSentinel;
  const bValue = b ?? nullSentinel;
  return aValue - bValue;
}

export function createTaskComparator(
  sortBy: SortByType,
  sortDirection: "asc" | "desc"
): (a: TaskWithRelations, b: TaskWithRelations) => number {
  const directionMultiplier = sortDirection === "asc" ? 1 : -1;

  switch (sortBy) {
    case "due":
      return (a, b) =>
        directionMultiplier *
        compareNullableTimestamps(
          toTimestamp(a.deadline),
          toTimestamp(b.deadline),
          sortDirection
        );
    case "created":
      return (a, b) =>
        directionMultiplier *
        compareNullableTimestamps(
          toTimestamp(a.createdAt),
          toTimestamp(b.createdAt),
          sortDirection
        );
    case "updated":
      return (a, b) =>
        directionMultiplier *
        compareNullableTimestamps(
          toTimestamp(a.updatedAt),
          toTimestamp(b.updatedAt),
          sortDirection
        );
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
  return [...tasks].sort((a, b) => {
    const primary = comparator(a, b);
    if (primary !== 0) return primary;
    const priorityDiff =
      priorityOrder.indexOf(b.priority) - priorityOrder.indexOf(a.priority);
    if (priorityDiff !== 0) return priorityDiff;
    return a.name.localeCompare(b.name);
  });
}
