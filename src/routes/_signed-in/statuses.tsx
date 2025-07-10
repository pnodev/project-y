import { useSuspenseQuery } from "@tanstack/react-query";
import { Link, Outlet, createFileRoute } from "@tanstack/react-router";
import { FormEvent, useCallback } from "react";
import { ColorSelect } from "~/components/ColorSelect";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import {
  useCreateStatusMutation,
  useDeleteStatusMutation,
} from "~/db/mutations";
import { statusesQueryOptions } from "~/db/queries";
import { Color, COLOR_VALUES } from "~/db/schema";

export const Route = createFileRoute("/_signed-in/statuses")({
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
      const name = formData.get("name");
      const color = formData.get("color");
      e.currentTarget.reset();

      function isColor(x: unknown): x is Color {
        return typeof x === "string" && COLOR_VALUES.includes(x as Color);
      }

      if (typeof name !== "string" || !name) return;
      if (!isColor(color)) {
        console.error("invalid color:", color);
        return;
      }

      await createStatus({ name, color });
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
    <div>
      <form
        onSubmit={handleSubmit}
        className="border p-2 flex flex-col items-start gap-2 mb-3"
      >
        <Input type="text" placeholder="Name" name="name" />
        <ColorSelect name="color" />
        <Button type="submit">Create</Button>
      </form>
      {statusesQuery.isFetching ? <div>Loading...</div> : <div>Loaded</div>}
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
