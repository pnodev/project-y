import { useAuth, useOrganization, useUser } from "@clerk/tanstack-react-start";

export function useCurrentOwningIdentity() {
  const { organization } = useOrganization();
  const { user } = useUser();
  if (!organization) return { name: user?.fullName };
  return { name: organization.name };
}
