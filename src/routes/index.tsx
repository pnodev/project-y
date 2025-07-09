import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { FormEvent, useCallback } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { useCreateTaskMutation } from "~/db/mutations";
import { statusesQueryOptions, tasksQueryOptions } from "~/db/queries";
export const Route = createFileRoute("/")({
  loader: async ({ context }) => {
    await context.queryClient.ensureQueryData(tasksQueryOptions());
    await context.queryClient.ensureQueryData(statusesQueryOptions());
  },
  component: Home,
});

function Home() {
  const tasksQuery = useSuspenseQuery(tasksQueryOptions());
  const statusesQuery = useSuspenseQuery(statusesQueryOptions());
  const createTask = useCreateTaskMutation();
  const handleSubmit = useCallback(
    async (e: FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      const formData = new FormData(e.currentTarget);
      const name = formData.get("name") as string;
      const description = formData.get("description") as string;
      const statusId = formData.get("statusId") as string;
      e.currentTarget.reset();

      if (!name || !statusId || !description) {
        return;
      }

      await createTask({ name, description, statusId });
    },
    [createTask]
  );

  return (
    <div className="p-2">
      <Link to="/statuses">Statuses</Link>
      <form className="border p-2" onSubmit={handleSubmit}>
        <input type="text" placeholder="Name" name="name" />
        <textarea placeholder="Description" name="description" />
        <select name="statusId">
          <option value="">Select a status</option>
          {[...statusesQuery.data].map((status) => {
            return (
              <option key={status.id} value={status.id}>
                {status.name}
              </option>
            );
          })}
        </select>
        <button type="submit">Create</button>
      </form>

      <div className="flex overflow-x-auto gap-3">
        {[...statusesQuery.data].map((status) => {
          return (
            <div
              key={status.id}
              className="border p-2 flex flex-col gap-2 flex-1 min-w-[250px]"
            >
              <h2>{status.name}</h2>
              {[...tasksQuery.data]
                .filter((task) => task.statusId === status.id)
                .map((task) => {
                  return (
                    <Card key={task.id}>
                      <CardHeader>
                        <CardTitle>{task.name}</CardTitle>
                        <CardDescription>{task.description}</CardDescription>
                      </CardHeader>
                    </Card>
                  );
                })}
            </div>
          );
        })}
      </div>
    </div>
  );
}
