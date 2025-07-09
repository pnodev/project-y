import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { FormEvent, useCallback } from "react";
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
      <ul>
        {[...tasksQuery.data].map((task) => {
          return (
            <li key={task.id}>
              {task.name} -{" "}
              {statusesQuery.data.find((s) => s.id === task.statusId)?.name}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
