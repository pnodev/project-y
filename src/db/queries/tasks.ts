import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { createServerFn } from "@tanstack/react-start";
import { db } from "~/db";
import { TaskWithRelations } from "../schema";
import { getAuth } from "@clerk/tanstack-react-start/server";
import { getWebRequest } from "@tanstack/react-start/server";
import { getOwningIdentity } from "~/lib/utils";
import { useEventSource } from "~/hooks/use-event-source";

const fetchTasks = createServerFn({ method: "GET" })
  .validator((d: { projectId: string }) => d)
  .handler(async ({ data: { projectId } }): Promise<TaskWithRelations[]> => {
    const user = await getAuth(getWebRequest());
    console.log("Fetching tasks for user:", getOwningIdentity(user));
    console.info("Fetching tasks for project:", projectId);

    const rawTasks = await db.query.tasks.findMany({
      with: {
        status: true,
        labelsToTasks: {
          with: {
            label: true,
          },
        },
        attachments: {
          with: {
            task: true,
          },
        },
        project: true,
      },
      where: (model, { eq, and }) =>
        and(
          eq(model.owner, getOwningIdentity(user)),
          eq(model.projectId, projectId)
        ),
    });

    return rawTasks.map((task) => ({
      ...task,
      assignees: task.assignees as string[],
      labels: task.labelsToTasks.map((l) => l.label),
      labelsToTasks: undefined,
    }));
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

export const fetchTask = createServerFn({ method: "GET" })
  .validator((d: string) => d)
  .handler(async ({ data }): Promise<TaskWithRelations | null> => {
    console.info("Fetching task...");
    const user = await getAuth(getWebRequest());
    const task = await db.query.tasks.findFirst({
      where(fields, operators) {
        return operators.and(
          operators.eq(fields.id, data),
          operators.eq(fields.owner, getOwningIdentity(user))
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
      },
    });

    if (!task) return null;

    const { labelsToTasks, ...taskWithoutLabelsToTasks } = task;

    return {
      ...taskWithoutLabelsToTasks,
      assignees: task.assignees as string[],
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
