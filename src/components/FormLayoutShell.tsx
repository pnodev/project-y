import {
  PageSection,
  PageSectionContent,
  PageSectionFooter,
} from "~/components/PageSection";

type FormLayout = "page" | "sheet";

type FormLayoutShellProps = {
  layout?: FormLayout;
  title: string;
  children: React.ReactNode;
  footer: React.ReactNode;
  contentClassName?: string;
};

export function FormLayoutShell({
  layout = "page",
  title,
  children,
  footer,
  contentClassName,
}: FormLayoutShellProps) {
  if (layout === "sheet") {
    return (
      <div className={contentClassName ?? "space-y-4"}>{children}</div>
    );
  }

  return (
    <PageSection title={title}>
      <PageSectionContent className={contentClassName ?? "space-y-6"}>
        {children}
      </PageSectionContent>
      <PageSectionFooter>{footer}</PageSectionFooter>
    </PageSection>
  );
}
