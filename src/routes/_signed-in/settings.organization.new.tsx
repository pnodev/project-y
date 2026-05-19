import { createFileRoute } from "@tanstack/react-router";
import { PageLayout } from "~/components/PageLayout";
import { CreateOrganizationForm } from "~/components/settings/CreateOrganizationForm";

export const Route = createFileRoute("/_signed-in/settings/organization/new")({
  head: () => ({
    meta: [{ title: "Create organization" }],
  }),
  component: RouteComponent,
});

function RouteComponent() {
  return (
    <PageLayout title="Create organization">
      <CreateOrganizationForm />
    </PageLayout>
  );
}
