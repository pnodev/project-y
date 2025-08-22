import { createFileRoute } from "@tanstack/react-router";
import { SprintFormCreate } from "~/components/forms/SprintForm";
import { PageLayout } from "~/components/PageLayout";
import { useCreateSprintMutation } from "~/db/mutations/sprints";

export const Route = createFileRoute("/_signed-in/sprints/new")({
  component: RouteComponent,
});

function RouteComponent() {
  const createSprint = useCreateSprintMutation();
  return (
    <PageLayout title="New Sprint">
      <SprintFormCreate onSubmit={async (data) => await createSprint(data)} />
    </PageLayout>
  );
}
