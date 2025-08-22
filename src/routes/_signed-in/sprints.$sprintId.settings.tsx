import {
  createFileRoute,
  useNavigate,
  useParams,
} from "@tanstack/react-router";
import { useState } from "react";
import { ConfirmDialog } from "~/components/ConfirmDialog";
import { EndlessLoadingSpinner } from "~/components/EndlessLoadingSpinner";
import { SprintFormEdit } from "~/components/forms/SprintForm";
import { PageLayout } from "~/components/PageLayout";
import { PageSection, PageSectionContent } from "~/components/PageSection";
import { Button } from "~/components/ui/button";
import {
  useDeleteSprintMutation,
  useUpdateSprintMutation,
} from "~/db/mutations/sprints";
import { useSprintQuery } from "~/db/queries/sprints";

export const Route = createFileRoute("/_signed-in/sprints/$sprintId/settings")({
  component: RouteComponent,
});

function RouteComponent() {
  const params = useParams({ from: Route.id });
  const sprintQuery = useSprintQuery(params.sprintId);
  const updateSprint = useUpdateSprintMutation();
  const deleteSprint = useDeleteSprintMutation();
  const [isDeleting, setIsDeleting] = useState(false);
  const navigate = useNavigate();

  if (!sprintQuery.data) {
    return <EndlessLoadingSpinner centered isActive={true} />;
  }

  return (
    <PageLayout title="Sprint Settings">
      <SprintFormEdit
        sprint={sprintQuery.data}
        onSubmit={async (data) => {
          await updateSprint(data);
        }}
      />

      <PageSection title="Danger Zone">
        <PageSectionContent>
          <p className="mb-6">The following actions are not reversible.</p>
          <ConfirmDialog
            title="Confirm Deletion"
            description={`Are you sure you want to delete this sprint? This action cannot be undone.`}
            onConfirm={async () => {
              if (!sprintQuery.data) return;
              setIsDeleting(true);
              await deleteSprint(sprintQuery.data.id);
              setIsDeleting(false);
              navigate({
                to: "/dashboard",
              });
            }}
            confirmText="Delete"
            cancelText="Cancel"
          >
            <Button variant={"destructive"}>Delete Sprint</Button>
          </ConfirmDialog>
        </PageSectionContent>
      </PageSection>
    </PageLayout>
  );
}
