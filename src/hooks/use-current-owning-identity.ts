import { authClient } from "~/lib/auth-client";
import { formatUserName } from "~/lib/utils";
import { useEffect, useState } from "react";

export function useCurrentOwningIdentity() {
  const { data: session } = authClient.useSession();
  const [org, setOrg] = useState<{ name: string; avatar: string } | null>(null);

  useEffect(() => {
    const activeOrgId = session?.session.activeOrganizationId;
    if (!activeOrgId) {
      setOrg(null);
      return;
    }

    let cancelled = false;

    void authClient.organization
      .getFullOrganization({
        query: { organizationId: activeOrgId },
      })
      .then(({ data }) => {
        if (cancelled || session?.session.activeOrganizationId !== activeOrgId) {
          return;
        }
        if (data) {
          setOrg({
            name: data.name,
            avatar: data.logo ?? "",
          });
        }
      });

    return () => {
      cancelled = true;
    };
  }, [session?.session.activeOrganizationId]);

  if (org) {
    return { name: org.name, avatar: org.avatar };
  }

  const authUser = session?.user as
    | { firstname?: string; lastname?: string; name?: string }
    | undefined;
  const firstname = authUser?.firstname;
  const lastname = authUser?.lastname;

  return {
    name: formatUserName(firstname, lastname) || session?.user.name || "",
    avatar: session?.user.image ?? "",
  };
}
