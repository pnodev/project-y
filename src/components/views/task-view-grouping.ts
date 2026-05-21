import type { Status, TaskWithRelations } from "~/db/schema";

export type TaskStatusSection = {
  key: string;
  status: Status | null;
  tasks: TaskWithRelations[];
};

export function groupTasksByStatus(
  tasks: TaskWithRelations[],
  statuses: Status[]
): TaskStatusSection[] {
  const unassigned: TaskWithRelations[] = [];
  const byStatusId = new Map<string, TaskWithRelations[]>();

  for (const status of statuses) {
    byStatusId.set(status.id, []);
  }

  const knownStatusIds = new Set(statuses.map((s) => s.id));

  for (const task of tasks) {
    if (!task.statusId) {
      unassigned.push(task);
      continue;
    }
    if (!byStatusId.has(task.statusId)) {
      byStatusId.set(task.statusId, []);
    }
    byStatusId.get(task.statusId)!.push(task);
  }

  const sections: TaskStatusSection[] = [];

  if (unassigned.length > 0) {
    sections.push({ key: "unassigned", status: null, tasks: unassigned });
  }

  for (const status of statuses) {
    sections.push({
      key: status.id,
      status,
      tasks: byStatusId.get(status.id) ?? [],
    });
  }

  for (const [statusId, bucketTasks] of byStatusId) {
    if (!knownStatusIds.has(statusId) && bucketTasks.length > 0) {
      sections.push({
        key: `unknown-${statusId}`,
        status: null,
        tasks: bucketTasks,
      });
    }
  }

  return sections;
}

export function flattenSectionTaskIds(
  sections: TaskStatusSection[],
  sortTasksFn: (tasks: TaskWithRelations[]) => TaskWithRelations[]
): string[] {
  return sections.flatMap((section) =>
    sortTasksFn(section.tasks).map((t) => t.id)
  );
}
