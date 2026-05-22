import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { createServerFn } from "@tanstack/react-start";
import { db } from "~/db";
import { Project, TaskWithRelations } from "../schema";
import { requireSessionFromRequest } from "~/lib/session";
import { getOwningIdentity } from "~/lib/utils";
import { useEventSource } from "~/hooks/use-event-source";

/** Board cards only need lightweight relations (not full attachments / subtask bodies). */
export const boardTaskRelationsForProject = {
  labelsToTasks: {
    with: {
      label: true,
    },
  },
  attachments: {
    columns: {
      id: true,
    },
  },
  assignees: true,
  sprint: true,
  subTasks: {
    columns: {
      id: true,
      done: true,
    },
  },
} as const;

export const boardTaskRelationsForSprint = {
  ...boardTaskRelationsForProject,
  project: true,
} as const;

export type BoardTaskRow = Awaited<
  ReturnType<
    typeof db.query.tasks.findMany<{
      with: typeof boardTaskRelationsForSprint;
    }>
  >
>[number];

function stubProject(task: BoardTaskRow): Project {
  return {
    id: task.projectId,
    name: "",
    description: null,
    taskKeyPrefix: null,
    nextTaskNumber: 1,
    owner: task.owner,
    logo: null,
    createdAt: task.createdAt,
    updatedAt: task.updatedAt,
  };
}

export function mapBoardTasks(
  rawTasks: BoardTaskRow[],
  options: { includeProject: boolean }
): TaskWithRelations[] {
  return rawTasks.map((task) => ({
    ...task,
    labels: task.labelsToTasks.map((l) => l.label),
    labelsToTasks: undefined,
    project:
      options.includeProject && "project" in task && task.project
        ? task.project
        : stubProject(task),
    subTasks: task.subTasks.map((subTask) => ({
      ...subTask,
      description: null,
      taskId: task.id,
      owner: task.owner,
      projectId: task.projectId,
      createdAt: task.createdAt,
      updatedAt: task.updatedAt,
      assignees: [],
    })),
  })) as unknown as TaskWithRelations[];
}

type TaskDetailRow = NonNullable<
  Awaited<
    ReturnType<
      typeof db.query.tasks.findFirst<{
        with: {
          status: true;
          labelsToTasks: { with: { label: true } };
          attachments: true;
          project: true;
          assignees: true;
          subTasks: { with: { assignees: true } };
          sprint: true;
        };
      }>
    >
  >
>;

export function mapTaskWithRelations(task: TaskDetailRow): TaskWithRelations {
  const { labelsToTasks, ...taskWithoutLabelsToTasks } = task;

  return {
    ...taskWithoutLabelsToTasks,
    labels: labelsToTasks.map((l) => l.label),
  };
}

const fetchTasks = createServerFn({ method: "GET" })
  .inputValidator((d: { projectId: string }) => d)
  .handler(async ({ data: { projectId } }): Promise<TaskWithRelations[]> => {
    const session = await requireSessionFromRequest();

    const rawTasks = await db.query.tasks.findMany({
      with: boardTaskRelationsForProject,
      where: (model, { eq, and }) =>
        and(
          eq(model.owner, getOwningIdentity(session)),
          eq(model.projectId, projectId)
        ),
    });

    return mapBoardTasks(rawTasks as BoardTaskRow[], { includeProject: false });
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
    const session = await requireSessionFromRequest();

    const rawTasks = await db.query.tasks.findMany({
      with: boardTaskRelationsForSprint,
      where: (model, { eq, and }) =>
        and(
          eq(model.owner, getOwningIdentity(session)),
          eq(model.sprintId, sprintId)
        ),
    });

    return mapBoardTasks(rawTasks, { includeProject: true });
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

export const ALL_TASKS_SCOPE = "all" as const;

const fetchAllTasks = createServerFn({ method: "GET" }).handler(
  async (): Promise<TaskWithRelations[]> => {
    const session = await requireSessionFromRequest();

    const rawTasks = await db.query.tasks.findMany({
      with: boardTaskRelationsForSprint,
      where: (model, { eq }) =>
        eq(model.owner, getOwningIdentity(session)),
    });

    return mapBoardTasks(rawTasks, { includeProject: true });
  }
);

export const allTasksQueryOptions = () =>
  queryOptions({
    queryKey: ["tasks", ALL_TASKS_SCOPE],
    queryFn: () => fetchAllTasks(),
  });

export const useAllTasksQuery = () => {
  const queryData = useSuspenseQuery(allTasksQueryOptions());

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
    const session = await requireSessionFromRequest();
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

    return mapTaskWithRelations(task);
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
