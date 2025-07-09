import { queryOptions } from "@tanstack/react-query";
import { createServerFn } from "@tanstack/react-start";
import { db } from ".";

export const fetchTasks = createServerFn({ method: "GET" }).handler(
  async () => {
    console.info("Fetching tasks...");
    return await db.query.tasks.findMany();
  }
);

export const tasksQueryOptions = () =>
  queryOptions({
    queryKey: ["tasks"],
    queryFn: () => fetchTasks(),
  });

export const fetchStatuses = createServerFn({ method: "GET" }).handler(
  async () => {
    console.info("Fetching statuses...");
    return await db.query.statuses.findMany();
  }
);

export const statusesQueryOptions = () =>
  queryOptions({
    queryKey: ["statuses"],
    queryFn: () => fetchStatuses(),
  });
