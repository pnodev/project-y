import { useOrganization } from "@clerk/tanstack-react-start";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef } from "react";

export function useOrganizationCacheClear() {
  const { organization, isLoaded } = useOrganization();
  const queryClient = useQueryClient();
  const previousOrgId = useRef<string | null>(null);
  const isInitialized = useRef(false);

  useEffect(() => {
    if (!isLoaded) return;

    const currentOrgId = organization?.id || null;

    if (!isInitialized.current) {
      isInitialized.current = true;
      previousOrgId.current = currentOrgId;
      return;
    }

    if (previousOrgId.current !== currentOrgId) {
      console.info("Organization switched, invalidating all queries");
      // This refetches all queries instead of clearing them
      // Prevents CancelledError while ensuring fresh data
      queryClient.invalidateQueries();
      previousOrgId.current = currentOrgId;
    }
  }, [organization?.id, isLoaded, queryClient]);
}
