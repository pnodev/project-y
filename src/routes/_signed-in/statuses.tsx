import { useSuspenseQuery } from "@tanstack/react-query";
import { Outlet, createFileRoute } from "@tanstack/react-router";
import { FormEvent, useCallback } from "react";
import { ColorSelect, selectableColorClasses } from "~/components/ColorSelect";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import {
  useCreateStatusMutation,
  useDeleteStatusMutation,
  useUpdateMultipleStatusesMutation,
  useUpdateStatusMutation,
} from "~/db/mutations/statuses";
import {
  statusesQueryOptions,
  statusesWithCountsQueryOptions,
} from "~/db/queries/statuses";
import { Color, COLOR_VALUES } from "~/db/schema";
import { Flag } from "lucide-react";
import { EntityList, EntityListItem } from "~/components/EntityList";
import { PageLayout } from "~/components/PageLayout";

export const Route = createFileRoute("/_signed-in/statuses")({
  loader: async ({ context }) => {
    await context.queryClient.ensureQueryData(statusesWithCountsQueryOptions());
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
  const updateStatus = useUpdateStatusMutation();
  const updateMultipleStatuses = useUpdateMultipleStatusesMutation();

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

  const handleUpdate = async (
    id: string,
    data: { name: string; color: keyof typeof selectableColorClasses }
  ) => {
    if (typeof data.name !== "string" || !data.name) return;

    await updateStatus({ id, name: data.name, color: data.color });
  };

  return (
    <PageLayout title="Statuses">
      <form
        onSubmit={handleSubmit}
        className="border p-2 flex flex-col items-start gap-2 mb-3"
      >
        <Input type="text" placeholder="Name" name="name" />
        <ColorSelect name="color" />
        <Button type="submit">Create</Button>
      </form>
      <EntityList
        items={[...statusesQuery.data]}
        onReorder={async (data) => {
          data.forEach((item, index) => {
            item.order = index;
          });
          await updateMultipleStatuses(data);
        }}
      >
        {[...statusesQuery.data]
          .sort((a, b) => {
            return a.order - b.order;
          })
          .map((status) => {
            return (
              <EntityListItem
                id={status.id}
                key={status.id}
                name={status.name}
                description={`${status.taskCount} ${
                  status.taskCount === 1 ? "Task" : "Tasks"
                } associated with this status`}
                color={status.color}
                handleDelete={() => handleDelete(status.id)}
                handleUpdate={(data) => handleUpdate(status.id, data)}
                icon={Flag}
              />
            );
          })}
      </EntityList>
      <hr />
      <Outlet />
    </PageLayout>
  );
}
