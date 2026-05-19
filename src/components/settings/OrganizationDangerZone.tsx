import { useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { ConfirmDialog } from "~/components/ConfirmDialog";
import {
  PageSection,
  PageSectionContent,
} from "~/components/PageSection";
import { Button } from "~/components/ui/button";
import { authClient } from "~/lib/auth-client";

type OrganizationDangerZoneProps = {
  organizationId: string;
  organizationName: string;
  onDeleted: () => void;
};

export function OrganizationDangerZone({
  organizationId,
  organizationName,
  onDeleted,
}: OrganizationDangerZoneProps) {
  const navigate = useNavigate();
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    setIsDeleting(true);
    const { error } = await authClient.organization.delete({ organizationId });
    setIsDeleting(false);

    if (error) {
      toast.error(error.message ?? "Failed to delete organization");
      return;
    }

    await authClient.organization.setActive({ organizationId: null });
    onDeleted();
    toast.success("Organization deleted");
    navigate({ to: "/dashboard" });
  };

  return (
    <PageSection title="Danger Zone">
      <PageSectionContent>
        <p className="mb-6 text-sm text-gray-500">
          Permanently delete <strong>{organizationName}</strong> and all
          associated membership data. This cannot be undone.
        </p>
        <ConfirmDialog
          title="Delete organization"
          description={`Are you sure you want to delete "${organizationName}"? This action cannot be undone.`}
          confirmText="Delete"
          onConfirm={handleDelete}
        >
          <Button variant="destructive" loading={isDeleting}>
            Delete organization
          </Button>
        </ConfirmDialog>
      </PageSectionContent>
    </PageSection>
  );
}
