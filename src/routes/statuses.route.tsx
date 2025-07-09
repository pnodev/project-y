import { useSuspenseQuery } from "@tanstack/react-query";
import { Link, Outlet, createFileRoute } from "@tanstack/react-router";
import { FormEvent, useCallback } from "react";
import {
  useCreateStatusMutation,
  useDeleteStatusMutation,
} from "~/db/mutations";
import { statusesQueryOptions } from "~/db/queries";

export const Route = createFileRoute("/statuses")({
  loader: async ({ context }) => {
    await context.queryClient.ensureQueryData(statusesQueryOptions());
  },
  head: () => ({
    meta: [{ title: "Statuses" }],
  }),
  component: StatusesComponent,
});

function StatusesComponent() {
  const statusesQuery = useSuspenseQuery(statusesQueryOptions());
  const createStatus = useCreateStatusMutation();
  const deleteStatus = useDeleteStatusMutation();

  const handleSubmit = useCallback(
    async (e: FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      const formData = new FormData(e.currentTarget);
      const name = formData.get("name") as string;
      e.currentTarget.reset();

      if (!name) {
        return;
      }

      await createStatus({ name });
    },
    [createStatus]
  );

  const handleDelete = useCallback(
    async (id: string) => {
      await deleteStatus(id);
    },
    [deleteStatus]
  );

  return (
    <div className="p-2 flex gap-2">
      <form onSubmit={handleSubmit}>
        <input type="text" placeholder="Name" name="name" />
        <button type="submit">Create</button>
      </form>
      <ul className="list-disc pl-4">
        {[...statusesQuery.data].map((status) => {
          return (
            <li key={status.id} className="whitespace-nowrap">
              {status.name}
              <button
                onClick={() => handleDelete(status.id)}
                type="button"
                className="ml-3 text-red-600"
              >
                Delete
              </button>
            </li>
          );
        })}
      </ul>
      <hr />
      <Outlet />
    </div>
  );
}
