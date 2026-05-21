import type { ReactNode } from "react";
import {
  PageSection,
  PageSectionContent,
  PageSectionDescription,
  PageSectionFooter,
} from "~/components/PageSection";

export function DangerZoneSection({
  description,
  children,
  action,
}: {
  description: ReactNode;
  children?: ReactNode;
  action: ReactNode;
}) {
  return (
    <PageSection title="Danger Zone" variant="danger">
      <PageSectionContent>
        <PageSectionDescription>{description}</PageSectionDescription>
        {children}
      </PageSectionContent>
      <PageSectionFooter>{action}</PageSectionFooter>
    </PageSection>
  );
}
