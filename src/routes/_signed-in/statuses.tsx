import { Outlet, createFileRoute } from "@tanstack/react-router";
import { FormEvent, useCallback } from "react";
import { ColorSelect, selectableColorClasses } from "~/components/ColorSelect";
import { EntityConfigCreateFields } from "~/components/EntityConfigCreateFields";
import { EntityList, EntityListItem } from "~/components/EntityList";
import { PageLayout } from "~/components/PageLayout";
import {
  PageSection,
  PageSectionContent,
  PageSectionFooter,
} from "~/components/PageSection";
import { Button } from "~/components/ui/button";
import {
  useCreateStatusMutation,
  useDeleteStatusMutation,
  useUpdateMultipleStatusesMutation,
  useUpdateStatusMutation,
} from "~/db/mutations/statuses";
import {
  statusesWithCountsQueryOptions,
  useStatusesWithCountsQuery,
} from "~/db/queries/statuses";
import { Color, COLOR_VALUES } from "~/db/schema";
import { Flag } from "lucide-react";

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
  const statusesQuery = useStatusesWithCountsQuery();
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

  const sortedStatuses = [...statusesQuery.data].sort(
    (a, b) => a.order - b.order
  );

  return (
    <PageLayout title="Statuses" contentClassName="gap-6">
      <form onSubmit={handleSubmit}>
        <PageSection title="Create status">
          <PageSectionContent>
            <EntityConfigCreateFields
              nameInputId="create-status-name"
              colorSelectId="create-status-color"
              namePlaceholder="e.g. In progress"
            />
          </PageSectionContent>
          <PageSectionFooter>
            <Button type="submit">Create status</Button>
          </PageSectionFooter>
        </PageSection>
      </form>

      <PageSection title="All statuses">
        <PageSectionContent>
          <EntityList
            items={[...statusesQuery.data]}
            onReorder={async (data) => {
              data.forEach((item, index) => {
                item.order = index;
              });
              await updateMultipleStatuses(data);
            }}
          >
            {sortedStatuses.map((status) => (
              <EntityListItem
                id={status.id}
                key={status.id}
                name={status.name}
                description={`${status.taskCount} ${
                  status.taskCount === 1 ? "task" : "tasks"
                } associated with this status`}
                color={status.color}
                handleDelete={() => handleDelete(status.id)}
                handleUpdate={(data) => handleUpdate(status.id, data)}
                icon={Flag}
              />
            ))}
          </EntityList>
        </PageSectionContent>
      </PageSection>

      <Outlet />
    </PageLayout>
  );
}
