import { authClient } from "~/lib/auth-client";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef } from "react";

export function useOrganizationCacheClear() {
  const { data: session } = authClient.useSession();
  const queryClient = useQueryClient();
  const previousOrgId = useRef<string | null>(null);
  const isInitialized = useRef(false);

  useEffect(() => {
    if (!session) return;

    const currentOrgId = session.session.activeOrganizationId ?? null;

    if (!isInitialized.current) {
      isInitialized.current = true;
      previousOrgId.current = currentOrgId;
      return;
    }

    if (previousOrgId.current !== currentOrgId) {
      console.info("Organization switched, invalidating all queries");
      queryClient.invalidateQueries();
      previousOrgId.current = currentOrgId;
    }
  }, [session?.session.activeOrganizationId, session, queryClient]);
}
