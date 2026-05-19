import { createFileRoute } from "@tanstack/react-router";
import { PageLayout } from "~/components/PageLayout";
import { UserSettingsForm } from "~/components/settings/UserSettingsForm";
import { authClient } from "~/lib/auth-client";

export const Route = createFileRoute("/_signed-in/settings/account")({
  head: () => ({
    meta: [{ title: "Account settings" }],
  }),
  component: RouteComponent,
});

function RouteComponent() {
  const { data: session } = authClient.useSession();
  const user = session?.user;

  if (!user) {
    return null;
  }

  const authUser = user as {
    firstname?: string;
    lastname?: string;
    image?: string | null;
    email: string;
    name?: string;
  };

  return (
    <PageLayout title="Account settings">
      <UserSettingsForm
        user={{
          email: authUser.email,
          image: authUser.image,
          firstname: authUser.firstname,
          lastname: authUser.lastname,
          name: authUser.name,
        }}
      />
    </PageLayout>
  );
}
