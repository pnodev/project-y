import type { ReactNode } from "react";
import { FormSheetSection } from "~/components/FormSheetSection";

export function FormSheetDangerZone({
  description,
  action,
}: {
  description: ReactNode;
  action: ReactNode;
}) {
  return (
    <FormSheetSection title="Danger zone" variant="danger" defaultOpen={false}>
      <p className="text-sm text-muted-foreground">{description}</p>
      <div className="flex justify-end pt-1">{action}</div>
    </FormSheetSection>
  );
}
