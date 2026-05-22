import { createFileRoute } from "@tanstack/react-router";
import { useCallback } from "react";
import { selectableColorClasses } from "~/components/ColorSelect";
import { EntityList, EntityListItem } from "~/components/EntityList";
import { PageCreateButton } from "~/components/PageCreateButton";
import { PageLayout } from "~/components/PageLayout";
import { PageSection, PageSectionContent } from "~/components/PageSection";
import {
  labelsWithCountsQueryOptions,
  useLabelsWithCountsQuery,
} from "~/db/queries/labels";
import {
  useDeleteLabelMutation,
  useUpdateLabelMutation,
  useUpdateMultipleLabelsMutation,
} from "~/db/mutations/labels";
import { FORM_SHEET_CREATE_LINKS } from "~/lib/form-sheet-search";
import { Tag } from "lucide-react";

export const Route = createFileRoute("/_signed-in/labels")({
  loader: async ({ context }) => {
    await context.queryClient.ensureQueryData(labelsWithCountsQueryOptions());
  },
  head: () => ({
    meta: [{ title: "Labels" }],
  }),
  component: LabelsComponent,
});

function LabelsComponent() {
  const labelsQuery = useLabelsWithCountsQuery();
  const deleteLabel = useDeleteLabelMutation();
  const updateLabel = useUpdateLabelMutation();
  const updateMultipleLabels = useUpdateMultipleLabelsMutation();

  const handleDelete = useCallback(
    async (id: string) => {
      await deleteLabel(id);
    },
    [deleteLabel]
  );

  const handleUpdate = async (
    id: string,
    data: { name: string; color: keyof typeof selectableColorClasses }
  ) => {
    if (typeof data.name !== "string" || !data.name) return;

    await updateLabel({ id, name: data.name, color: data.color });
  };

  const sortedLabels = [...labelsQuery.data].sort((a, b) => a.order - b.order);

  return (
    <PageLayout
      title="Labels"
      contentClassName="gap-6"
      actions={
        <PageCreateButton
          label="Create label"
          to={FORM_SHEET_CREATE_LINKS.label.to}
          search={FORM_SHEET_CREATE_LINKS.label.search}
        />
      }
    >
      <PageSection title="All labels">
        <PageSectionContent>
          {sortedLabels.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No labels yet. Use the + button above to create one.
            </p>
          ) : (
            <EntityList
              items={[...labelsQuery.data]}
              onReorder={async (data) => {
                data.forEach((item, index) => {
                  item.order = index;
                });
                await updateMultipleLabels(data);
              }}
            >
              {sortedLabels.map((label) => (
                <EntityListItem
                  id={label.id}
                  key={label.id}
                  name={label.name}
                  description={`${label.taskCount} ${
                    label.taskCount === 1 ? "task" : "tasks"
                  } associated with this label`}
                  color={label.color}
                  handleDelete={() => handleDelete(label.id)}
                  handleUpdate={(data) => handleUpdate(label.id, data)}
                  icon={Tag}
                />
              ))}
            </EntityList>
          )}
        </PageSectionContent>
      </PageSection>
    </PageLayout>
  );
}
