import { queryOptions } from "@tanstack/react-query";
import { createServerFn } from "@tanstack/react-start";
import { db } from "~/db";
import { TaskWithLabels } from "../schema";

export const fetchTasks = createServerFn({ method: "GET" }).handler(
  async (): Promise<TaskWithLabels[]> => {
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
  .handler(async ({ data }): Promise<TaskWithLabels> => {
    console.info("Fetching task...");
    const task = await db.query.tasks.findFirst({
      where(fields, operators) {
        return operators.eq(fields.id, data);
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

    return {
      ...task,
      labels: task.labelsToTasks.map((l) => l.label),
      labelsToTasks: undefined,
    };
  });

export const taskQueryOptions = (id: string) =>
  queryOptions({
    queryKey: ["tasks", id],
    queryFn: () => fetchTask({ data: id }),
  });
