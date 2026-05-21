import { Link, createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { EndlessLoadingSpinner } from "~/components/EndlessLoadingSpinner";
import { PageLayout } from "~/components/PageLayout";
import { Button } from "~/components/ui/button";
import { OrganizationDangerZone } from "~/components/settings/OrganizationDangerZone";
import { OrganizationMembersSection } from "~/components/settings/OrganizationMembersSection";
import { OrganizationSettingsForm } from "~/components/settings/OrganizationSettingsForm";
import { authClient } from "~/lib/auth-client";
import { useOrganizations, type Organization } from "~/hooks/use-organizations";

type FullOrganization = Organization & {
  members: Array<{
    id: string;
    role: string;
    userId: string;
    user: {
      id: string;
      email: string;
      image?: string | null;
      firstname?: string;
      lastname?: string;
      name?: string;
    };
  }>;
};

export const Route = createFileRoute("/_signed-in/settings/organization")({
  head: () => ({
    meta: [{ title: "Organization settings" }],
  }),
  component: RouteComponent,
});

function RouteComponent() {
  const { data: session } = authClient.useSession();
  const { activeOrganizationId, loadOrganizations } = useOrganizations();
  const [fullOrg, setFullOrg] = useState<FullOrganization | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const loadRequestIdRef = useRef(0);

  const loadFullOrg = useCallback(async () => {
    const requestId = ++loadRequestIdRef.current;

    if (!activeOrganizationId) {
      setFullOrg(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    const { data, error } = await authClient.organization.getFullOrganization({
      query: { organizationId: activeOrganizationId, membersLimit: 100 },
    });

    if (requestId !== loadRequestIdRef.current) {
      return;
    }

    setIsLoading(false);

    if (error) {
      console.error(error);
      setFullOrg(null);
      return;
    }

    setFullOrg(data as FullOrganization);
  }, [activeOrganizationId]);

  useEffect(() => {
    void loadFullOrg();
  }, [loadFullOrg]);

  const handleChanged = async () => {
    await loadOrganizations(activeOrganizationId);
    await loadFullOrg();
  };

  if (!activeOrganizationId) {
    return (
      <PageLayout title="Organization settings">
        <div className="rounded-md border bg-muted/30 p-8 text-center max-w-lg">
          <p className="text-sm text-gray-600 mb-4">
            Switch to an organization using the header menu, or create a new one.
          </p>
          <Button asChild>
            <Link to="/settings/organization/new">Create organization</Link>
          </Button>
        </div>
      </PageLayout>
    );
  }

  if (isLoading && !fullOrg) {
    return (
      <PageLayout title="Organization settings">
        <EndlessLoadingSpinner centered isActive />
      </PageLayout>
    );
  }

  if (!fullOrg) {
    return (
      <PageLayout title="Organization settings">
        <p className="text-sm text-gray-500">Could not load organization.</p>
      </PageLayout>
    );
  }

  const currentMember = fullOrg.members.find(
    (m) => m.userId === session?.user.id
  );
  const currentUserRole = currentMember?.role ?? "member";

  return (
    <PageLayout
      title="Organization settings"
      actions={
        <Button variant="outline" size="sm" asChild>
          <Link to="/settings/organization/new">Create another</Link>
        </Button>
      }
    >
      <div className="grid gap-6">
        <OrganizationSettingsForm
          organization={{
            id: fullOrg.id,
            name: fullOrg.name,
            slug: fullOrg.slug,
            logo: fullOrg.logo,
          }}
          onUpdated={handleChanged}
        />
        <OrganizationMembersSection
          organizationId={fullOrg.id}
          members={fullOrg.members}
          currentUserId={session?.user.id ?? ""}
          currentUserRole={currentUserRole}
          onChanged={handleChanged}
        />
        <OrganizationDangerZone
          organizationId={fullOrg.id}
          organizationName={fullOrg.name}
          onDeleted={() => void loadOrganizations(null)}
        />
      </div>
    </PageLayout>
  );
}
