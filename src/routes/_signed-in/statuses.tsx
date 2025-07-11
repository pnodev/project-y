import { useSuspenseQuery } from "@tanstack/react-query";
import { Link, Outlet, createFileRoute } from "@tanstack/react-router";
import { FormEvent, useCallback } from "react";
import { ColorSelect, selectableColorClasses } from "~/components/ColorSelect";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import {
  useCreateStatusMutation,
  useDeleteStatusMutation,
} from "~/db/mutations";
import {
  statusesQueryOptions,
  statusesWithCountsQueryOptions,
} from "~/db/queries";
import { Color, COLOR_VALUES } from "~/db/schema";
import { cn } from "~/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import { EllipsisVertical, Trash2 } from "lucide-react";

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
  const statusesQuery = useSuspenseQuery(statusesWithCountsQueryOptions());
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
      <ul className="grid gap-2">
        {[...statusesQuery.data].map((status) => {
          return (
            <li
              key={status.id}
              className="col-span-1 flex rounded-md shadow-xs"
            >
              <div
                className={cn(
                  "flex w-16 shrink-0 rounded-l-md",
                  selectableColorClasses[status.color]
                )}
              ></div>
              <div className="flex flex-1 items-center justify-between truncate rounded-r-md border-t border-r border-b border-gray-200 bg-white">
                <div className="flex-1 truncate px-4 py-2 text-sm">
                  <p className="font-medium text-gray-900">{status.name}</p>
                  <p className="text-gray-500">
                    {status.taskCount}{" "}
                    {status.taskCount === 1 ? "Task" : "Tasks"} associated with
                    this status
                  </p>
                </div>
                <div className="shrink-0 pr-2">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <EllipsisVertical />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent>
                      <DropdownMenuItem asChild>
                        <button
                          type="button"
                          className="w-full cursor-pointer"
                          onClick={() => handleDelete(status.id)}
                        >
                          <Trash2 />
                          Delete
                        </button>
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            </li>
          );
        })}
      </ul>
      <hr />
      <Outlet />
    </div>
  );
}
