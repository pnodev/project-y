import { createCollection } from "@tanstack/react-db";
import { queryCollectionOptions } from "@tanstack/query-db-collection";
import { db } from ".";
import { QueryClient, useQueryClient } from "@tanstack/react-query";
import { Task } from "./schema";
import { createServerFn } from "@tanstack/react-start";

const fetchTasks = createServerFn({ method: "GET" }).handler(async () => {
  const tasks = await db.query.tasks.findMany();
  return tasks;
});

const queryClient = new QueryClient();

export const taskCollection = createCollection(
  queryCollectionOptions({
    queryKey: ["tasks"],
    queryFn: async () => {
      const tasks = await fetchTasks();
      return tasks;
    },
    getKey: (task) => task.id,
    queryClient,
  })
);
