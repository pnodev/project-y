import { useAuth, useOrganization, useUser } from "@clerk/tanstack-react-start";

export function useCurrentOwningIdentity() {
  const { organization } = useOrganization();
  const { user } = useUser();
  if (!organization) return { name: user?.fullName, avatar: user?.imageUrl };
  return { name: organization.name, avatar: organization.imageUrl };
}
