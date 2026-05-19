import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { createServerFn } from "@tanstack/react-start";
import { db } from "~/db";
import { TaskWithRelations } from "../schema";
import { requireSession } from "~/lib/auth-functions";
import { getOwningIdentity } from "~/lib/utils";
import { useEventSource } from "~/hooks/use-event-source";

const boardTaskRelations = {
  status: true,
  labelsToTasks: {
    with: {
      label: true,
    },
  },
  attachments: true,
  project: true,
  assignees: true,
  sprint: true,
  subTasks: true,
} as const;

function mapBoardTasks(
  rawTasks: Awaited<ReturnType<typeof db.query.tasks.findMany<{ with: typeof boardTaskRelations }>>>
): TaskWithRelations[] {
  return rawTasks.map((task) => ({
    ...task,
    labels: task.labelsToTasks.map((l) => l.label),
    labelsToTasks: undefined,
    subTasks: task.subTasks.map((subTask) => ({
      ...subTask,
      assignees: [],
    })),
  }));
}

const fetchTasks = createServerFn({ method: "GET" })
  .inputValidator((d: { projectId: string }) => d)
  .handler(async ({ data: { projectId } }): Promise<TaskWithRelations[]> => {
    const session = await requireSession();
    console.log("Fetching tasks for user:", getOwningIdentity(session));
    console.info("Fetching tasks for project:", projectId);

    const rawTasks = await db.query.tasks.findMany({
      with: boardTaskRelations,
      where: (model, { eq, and }) =>
        and(
          eq(model.owner, getOwningIdentity(session)),
          eq(model.projectId, projectId)
        ),
    });

    return mapBoardTasks(rawTasks);
  });

export const tasksQueryOptions = (projectId: string) =>
  queryOptions({
    queryKey: ["tasks", projectId],
    queryFn: () => fetchTasks({ data: { projectId } }),
  });

export const useTasksQuery = (projectId: string) => {
  const queryData = useSuspenseQuery(tasksQueryOptions(projectId));

  useEventSource({
    topics: [
      "task-create",
      "task-delete",
      ...queryData.data.map((t) => `task-update-${t.id}`),
    ],
    callback: () => {
      queryData.refetch();
    },
  });

  return { ...queryData };
};

const fetchTasksForSprint = createServerFn({ method: "GET" })
  .inputValidator((d: { sprintId: string }) => d)
  .handler(async ({ data: { sprintId } }): Promise<TaskWithRelations[]> => {
    const session = await requireSession();
    console.log("Fetching tasks for user:", getOwningIdentity(session));
    console.info("Fetching tasks for sprint:", sprintId);

    const rawTasks = await db.query.tasks.findMany({
      with: boardTaskRelations,
      where: (model, { eq, and }) =>
        and(
          eq(model.owner, getOwningIdentity(session)),
          eq(model.sprintId, sprintId)
        ),
    });

    return mapBoardTasks(rawTasks);
  });

export const tasksForSprintQueryOptions = (sprintId: string) =>
  queryOptions({
    queryKey: ["tasks", sprintId],
    queryFn: () => fetchTasksForSprint({ data: { sprintId } }),
  });

export const useTasksForSprintQuery = (sprintId: string) => {
  const queryData = useSuspenseQuery(tasksForSprintQueryOptions(sprintId));

  useEventSource({
    topics: [
      "task-create",
      "task-delete",
      ...queryData.data.map((t) => `task-update-${t.id}`),
    ],
    callback: () => {
      queryData.refetch();
    },
  });

  return { ...queryData };
};

export const fetchTask = createServerFn({ method: "GET" })
  .inputValidator((d: string) => d)
  .handler(async ({ data }): Promise<TaskWithRelations | null> => {
    console.info("Fetching task...");
    const session = await requireSession();
    const task = await db.query.tasks.findFirst({
      where(fields, operators) {
        return operators.and(
          operators.eq(fields.id, data),
          operators.eq(fields.owner, getOwningIdentity(session))
        );
      },
      with: {
        status: true,
        labelsToTasks: {
          with: {
            label: true,
          },
        },
        attachments: true,
        project: true,
        assignees: true,
        subTasks: {
          with: {
            assignees: true,
          },
        },
        sprint: true,
      },
    });

    if (!task) return null;

    const { labelsToTasks, ...taskWithoutLabelsToTasks } = task;

    return {
      ...taskWithoutLabelsToTasks,
      labels: labelsToTasks.map((l) => l.label),
    };
  });

export const taskQueryOptions = (id: string) =>
  queryOptions({
    queryKey: ["tasks", id],
    queryFn: () => fetchTask({ data: id }),
  });

export const useTaskQuery = (taskId: string) => {
  const queryData = useSuspenseQuery(taskQueryOptions(taskId));

  useEventSource({
    topics: [`task-update-${taskId}`],
    callback: () => {
      queryData.refetch();
    },
  });

  return { ...queryData };
};
