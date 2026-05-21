import { useParams } from "@tanstack/react-router";
import { useNavigate } from "@tanstack/react-router";
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { ConfirmDialog } from "~/components/ConfirmDialog";
import { EndlessLoadingSpinner } from "~/components/EndlessLoadingSpinner";
import { ProjectFormEdit } from "~/components/forms/ProjectForm";
import { DangerZoneSection } from "~/components/DangerZoneSection";
import { PageLayout } from "~/components/PageLayout";
import { Button } from "~/components/ui/button";
import {
  useDeleteProjectMutation,
  useUpdateProjectMutation,
} from "~/db/mutations/projects";
import { projectQueryOptions, useProjectQuery } from "~/db/queries/projects";

export const Route = createFileRoute(
  "/_signed-in/projects/$projectId/settings"
)({
  loader: async ({ context, params }) => {
    await context.queryClient.ensureQueryData(
      projectQueryOptions(params.projectId)
    );
  },
  component: RouteComponent,
});

function RouteComponent() {
  const params = useParams({ from: Route.id });
  const updateProject = useUpdateProjectMutation();
  const projectQuery = useProjectQuery(params.projectId);
  const navigate = useNavigate();
  const deleteProject = useDeleteProjectMutation();
  const [isDeleting, setIsDeleting] = useState(false);

  if (!projectQuery.data) {
    return <EndlessLoadingSpinner centered isActive={true} />;
  }

  return (
    <PageLayout title="Project Settings">
      <EndlessLoadingSpinner
        centered
        isActive={isDeleting}
        hasBackdrop
        className="fixed z-50"
      />
      <div className="grid gap-6">
        <ProjectFormEdit
          project={projectQuery.data}
          onSubmit={async (data) => {
            await updateProject(data);
          }}
        />

        <DangerZoneSection
          description="The following actions are not reversible."
          action={
            <ConfirmDialog
              title="Confirm Deletion"
              description={`Are you sure you want to delete this project? This action cannot be undone.`}
              onConfirm={async () => {
                if (!projectQuery.data) return;
                setIsDeleting(true);
                await deleteProject(projectQuery.data.id);
                setIsDeleting(false);
                navigate({
                  to: "/dashboard",
                });
              }}
              confirmText="Delete"
              cancelText="Cancel"
            >
              <Button variant="destructive">Delete Project</Button>
            </ConfirmDialog>
          }
        />
      </div>
    </PageLayout>
  );
}
