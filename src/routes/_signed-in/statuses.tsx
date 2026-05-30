import { createFileRoute } from "@tanstack/react-router";
import { useCallback } from "react";
import { selectableColorClasses } from "~/components/ColorSelect";
import { EntityList, EntityListItem } from "~/components/EntityList";
import { PageCreateButton } from "~/components/PageCreateButton";
import { PageLayout } from "~/components/PageLayout";
import { PageSection, PageSectionContent } from "~/components/PageSection";
import {
  useDeleteStatusMutation,
  useUpdateMultipleStatusesMutation,
  useUpdateStatusMutation,
} from "~/db/mutations/statuses";
import {
  statusesWithCountsQueryOptions,
  useStatusesWithCountsQuery,
} from "~/db/queries/statuses";
import { FORM_SHEET_CREATE_LINKS } from "~/lib/form-sheet-search";
import { Flag } from "lucide-react";
import { pageMeta } from "~/utils/seo";

export const Route = createFileRoute("/_signed-in/statuses")({
  loader: async ({ context }) => {
    await context.queryClient.ensureQueryData(statusesWithCountsQueryOptions());
  },
  head: () => ({
    meta: [...pageMeta("Statuses")],
  }),
  component: StatusesComponent,
});

function StatusesComponent() {
  const statusesQuery = useStatusesWithCountsQuery();
  const deleteStatus = useDeleteStatusMutation();
  const updateStatus = useUpdateStatusMutation();
  const updateMultipleStatuses = useUpdateMultipleStatusesMutation();

  const handleDelete = useCallback(
    async (id: string) => {
      await deleteStatus(id);
    },
    [deleteStatus]
  );

  const handleUpdate = async (
    status: (typeof statusesQuery.data)[number],
    data: {
      name: string;
      color: keyof typeof selectableColorClasses;
      isClosing?: boolean;
    }
  ) => {
    if (typeof data.name !== "string" || !data.name) return;

    await updateStatus({
      id: status.id,
      name: data.name,
      color: data.color,
      order: status.order,
      isClosing: data.isClosing ?? false,
    });
  };

  const sortedStatuses = [...statusesQuery.data].sort(
    (a, b) => a.order - b.order
  );

  return (
    <PageLayout
      title="Statuses"
      contentClassName="gap-6"
      actions={
        <PageCreateButton
          label="Create status"
          to={FORM_SHEET_CREATE_LINKS.status.to}
          search={FORM_SHEET_CREATE_LINKS.status.search}
        />
      }
    >
      <PageSection title="All statuses">
        <PageSectionContent>
          {sortedStatuses.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No statuses yet. Use the + button above to create one.
            </p>
          ) : (
            <EntityList
              items={sortedStatuses}
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
                  isClosing={status.isClosing}
                  showClosingFields
                  handleDelete={() => handleDelete(status.id)}
                  handleUpdate={(data) => handleUpdate(status, data)}
                  icon={Flag}
                />
              ))}
            </EntityList>
          )}
        </PageSectionContent>
      </PageSection>
    </PageLayout>
  );
}
