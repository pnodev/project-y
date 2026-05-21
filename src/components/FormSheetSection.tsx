import { useId } from "react";
import { ChevronDown } from "lucide-react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "~/components/ui/collapsible";
import {
  formSheetSectionContentClass,
  formSheetSectionDangerChevronClass,
  formSheetSectionDangerContentClass,
  formSheetSectionDangerHeaderClass,
  formSheetSectionDangerTitleClass,
  formSheetSectionHeaderClass,
  formSheetSectionTitleClass,
} from "~/components/ui/surface-styles";
import { cn } from "~/lib/utils";

/**
 * Collapsible form section using shadcn/ui Collapsible (Radix) for keyboard
 * support, focus management, and aria-expanded on the trigger.
 */
export function FormSheetSection({
  title,
  children,
  className,
  defaultOpen = true,
  variant = "default",
}: {
  title: string;
  children: React.ReactNode;
  className?: string;
  defaultOpen?: boolean;
  variant?: "default" | "danger";
}) {
  const baseId = useId();
  const labelId = `${baseId}-label`;
  const contentId = `${baseId}-content`;
  const isDanger = variant === "danger";

  return (
    <Collapsible
      defaultOpen={defaultOpen}
      className={cn("group/form-sheet-section", className)}
    >
      <CollapsibleTrigger
        className={
          isDanger ? formSheetSectionDangerHeaderClass : formSheetSectionHeaderClass
        }
        aria-controls={contentId}
      >
        <span
          id={labelId}
          className={
            isDanger ? formSheetSectionDangerTitleClass : formSheetSectionTitleClass
          }
        >
          {title}
        </span>
        <ChevronDown
          className={
            isDanger
              ? formSheetSectionDangerChevronClass
              : "size-4 shrink-0 text-muted-foreground transition-transform duration-200 group-data-[state=open]/form-sheet-section:rotate-180"
          }
          aria-hidden
        />
        <span className="sr-only">, toggle {title} section</span>
      </CollapsibleTrigger>
      <CollapsibleContent
        id={contentId}
        role="region"
        aria-labelledby={labelId}
        className={
          isDanger ? formSheetSectionDangerContentClass : formSheetSectionContentClass
        }
      >
        {children}
      </CollapsibleContent>
    </Collapsible>
  );
}
