import { useCallback, useEffect, useState } from "react";
import { authClient } from "~/lib/auth-client";

export type Organization = {
  id: string;
  name: string;
  slug: string;
  logo?: string | null;
};

export function normalizeOrgSlug(slug: string) {
  return slug.toLowerCase().replace(/[^a-z0-9-]/g, "-");
}

export function useOrganizations() {
  const { data: session } = authClient.useSession();
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [activeOrg, setActiveOrg] = useState<Organization | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const syncActiveOrg = useCallback(
    (orgs: Organization[], activeOrganizationId: string | null | undefined) => {
      if (!activeOrganizationId) {
        setActiveOrg(null);
        return;
      }
      setActiveOrg(orgs.find((org) => org.id === activeOrganizationId) ?? null);
    },
    []
  );

  const loadOrganizations = useCallback(
    async (activeOrganizationId?: string | null) => {
      setIsLoading(true);
      const { data, error } = await authClient.organization.list();
      setIsLoading(false);

      if (error) {
        console.error(error);
        return;
      }

      const orgs = (data ?? []) as Organization[];
      setOrganizations(orgs);

      const activeId =
        activeOrganizationId !== undefined
          ? activeOrganizationId
          : session?.session.activeOrganizationId;
      syncActiveOrg(orgs, activeId);
    },
    [session?.session.activeOrganizationId, syncActiveOrg]
  );

  useEffect(() => {
    if (session) {
      void loadOrganizations();
    }
  }, [session?.session.activeOrganizationId, session?.user.id, loadOrganizations, session]);

  return {
    organizations,
    activeOrg,
    activeOrganizationId: session?.session.activeOrganizationId ?? null,
    isLoading,
    loadOrganizations,
    syncActiveOrg,
  };
}
