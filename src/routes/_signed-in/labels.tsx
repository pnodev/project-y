import { Outlet, createFileRoute } from "@tanstack/react-router";
import { FormEvent, useCallback } from "react";
import { ColorSelect, selectableColorClasses } from "~/components/ColorSelect";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Color, COLOR_VALUES } from "~/db/schema";
import { Tag } from "lucide-react";
import { EntityList, EntityListItem } from "~/components/EntityList";
import { PageLayout } from "~/components/PageLayout";
import {
  PageSection,
  PageSectionContent,
  PageSectionFooter,
} from "~/components/PageSection";
import {
  labelsWithCountsQueryOptions,
  useLabelsWithCountsQuery,
} from "~/db/queries/labels";
import {
  useCreateLabelMutation,
  useDeleteLabelMutation,
  useUpdateLabelMutation,
  useUpdateMultipleLabelsMutation,
} from "~/db/mutations/labels";

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
  const createLabel = useCreateLabelMutation();
  const deleteLabel = useDeleteLabelMutation();
  const updateLabel = useUpdateLabelMutation();
  const updateMultipleLabels = useUpdateMultipleLabelsMutation();

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

      await createLabel({ name, color });
    },
    [createLabel]
  );

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

  return (
    <PageLayout title="Labels">
      <form onSubmit={handleSubmit} className="mb-6">
        <PageSection title="Create label">
          <PageSectionContent className="max-w-md space-y-4">
            <Input type="text" placeholder="Name" name="name" />
            <ColorSelect name="color" />
          </PageSectionContent>
          <PageSectionFooter>
            <Button type="submit">Create label</Button>
          </PageSectionFooter>
        </PageSection>
      </form>
      <EntityList
        items={[...labelsQuery.data]}
        onReorder={async (data) => {
          data.forEach((item, index) => {
            item.order = index;
          });
          await updateMultipleLabels(data);
        }}
      >
        {[...labelsQuery.data]
          .sort((a, b) => {
            return a.order - b.order;
          })
          .map((label) => {
            return (
              <EntityListItem
                id={label.id}
                key={label.id}
                name={label.name}
                description={`${label.taskCount} ${
                  label.taskCount === 1 ? "Task" : "Tasks"
                } associated with this label`}
                color={label.color}
                handleDelete={() => handleDelete(label.id)}
                handleUpdate={(data) => handleUpdate(label.id, data)}
                icon={Tag}
              />
            );
          })}
      </EntityList>
      <hr />
      <Outlet />
    </PageLayout>
  );
}
