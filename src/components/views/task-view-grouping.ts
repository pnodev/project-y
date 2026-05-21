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

  for (const task of tasks) {
    if (!task.statusId) {
      unassigned.push(task);
      continue;
    }
    const bucket = byStatusId.get(task.statusId);
    if (bucket) {
      bucket.push(task);
    }
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
