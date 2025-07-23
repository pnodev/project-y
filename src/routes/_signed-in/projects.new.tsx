import { createFileRoute } from "@tanstack/react-router";
import { ProjectForm } from "~/components/forms/ProjectForm";
import { PageLayout } from "~/components/PageLayout";
import { useCreateProjectMutation } from "~/db/mutations/projects";

export const Route = createFileRoute("/_signed-in/projects/new")({
  component: RouteComponent,
});

function RouteComponent() {
  const createProject = useCreateProjectMutation();
  return (
    <PageLayout title="New Project">
      <ProjectForm onSubmit={async (data) => await createProject(data)} />
    </PageLayout>
  );
}
