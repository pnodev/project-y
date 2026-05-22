import { createContext, useContext } from "react";
import { cn } from "~/lib/utils";
import {
  formCardClass,
  formCardContentClass,
  formCardDangerClass,
  formCardDangerFooterClass,
  formCardDangerTitleClass,
  formCardDescriptionClass,
  formCardFooterClass,
  formCardHeaderClass,
  formCardTitleClass,
} from "./ui/surface-styles";

const PageSectionVariantContext = createContext<"default" | "danger">(
  "default"
);

export function PageSection({
  title,
  children,
  className,
  variant = "default",
}: React.ComponentProps<"section"> & {
  title?: string;
  children: React.ReactNode;
  variant?: "default" | "danger";
}) {
  return (
    <PageSectionVariantContext.Provider value={variant}>
      <section
        className={cn(
          variant === "danger" ? formCardDangerClass : formCardClass,
          className
        )}
      >
        {title ? (
          <div className={formCardHeaderClass}>
            <h2
              className={cn(
                variant === "danger"
                  ? formCardDangerTitleClass
                  : formCardTitleClass
              )}
            >
              {title}
            </h2>
          </div>
        ) : null}
        {children}
      </section>
    </PageSectionVariantContext.Provider>
  );
}

export function PageSectionDescription({
  children,
  className,
}: React.ComponentProps<"p">) {
  return (
    <p className={cn(formCardDescriptionClass, className)}>{children}</p>
  );
}

export function PageSectionContent({
  children,
  className,
}: React.ComponentProps<"div"> & {
  children: React.ReactNode;
}) {
  return (
    <div className={cn(formCardContentClass, className)}>{children}</div>
  );
}

export function PageSectionFooter({
  children,
  className,
  align = "end",
}: React.ComponentProps<"footer"> & {
  children: React.ReactNode;
  align?: "start" | "end";
}) {
  const isDanger = useContext(PageSectionVariantContext) === "danger";

  return (
    <footer
      className={cn(
        isDanger ? formCardDangerFooterClass : formCardFooterClass,
        align === "start" ? "justify-start" : "justify-end",
        className
      )}
    >
      {children}
    </footer>
  );
}
