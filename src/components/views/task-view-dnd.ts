import {
  DragEndEvent,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import type { TaskWithRelations, UpdateTask } from "~/db/schema";
import type { TaskStatusSection } from "./task-view-grouping";

export function getStatusDropId(section: TaskStatusSection): string {
  if (section.status) return `status:${section.status.id}`;
  if (section.key === "unassigned") return "status-unassigned";
  if (section.key.startsWith("unknown-")) {
    return `status:${section.key.slice("unknown-".length)}`;
  }
  return `status:${section.key}`;
}

export function parseStatusDropTarget(
  overId: string | number | undefined
): string | null | undefined {
  if (overId == null) return undefined;
  const id = String(overId);
  if (id === "status-unassigned") return null;
  if (id.startsWith("status:")) return id.slice("status:".length);
  return undefined;
}

export function useTaskViewSensors() {
  return useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 5 },
    })
  );
}

export function handleTaskStatusDrop(
  event: DragEndEvent,
  tasks: TaskWithRelations[],
  updateTask: (task: UpdateTask) => Promise<void>
) {
  const taskId = String(event.active.id).split(":")[1];
  const statusId = parseStatusDropTarget(event.over?.id);
  if (statusId === undefined) return;

  const task = tasks.find((t) => t.id === taskId);
  if (!task?.projectId) return;

  void updateTask({
    id: taskId,
    statusId,
    projectId: task.projectId,
    sprintId: task.sprintId ?? undefined,
  }).catch(() => undefined);
}
