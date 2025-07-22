import { queryOptions } from "@tanstack/react-query";
import { createServerFn } from "@tanstack/react-start";
import { db } from "~/db";
import { TaskWithLabels } from "../schema";
import { getAuth } from "@clerk/tanstack-react-start/server";
import { getWebRequest } from "@tanstack/react-start/server";
import { getOwningIdentity } from "~/lib/utils";

export const fetchTasks = createServerFn({ method: "GET" }).handler(
  async (): Promise<TaskWithLabels[]> => {
    const user = await getAuth(getWebRequest());
    console.log("Fetching tasks for user:", getOwningIdentity(user));
    console.info("Fetching tasks...");
    const rawTasks = await db.query.tasks.findMany({
      with: {
        status: true,
        labelsToTasks: {
          with: {
            label: true,
          },
        },
      },
      where: (model, { eq }) => eq(model.owner, getOwningIdentity(user)),
    });

    return rawTasks.map((task) => ({
      ...task,
      labels: task.labelsToTasks.map((l) => l.label),
      labelsToTasks: undefined,
    }));
  }
);

export const tasksQueryOptions = () =>
  queryOptions({
    queryKey: ["tasks"],
    queryFn: () => fetchTasks(),
  });

export const fetchTask = createServerFn({ method: "GET" })
  .validator((d: string) => d)
  .handler(async ({ data }): Promise<TaskWithLabels | null> => {
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
