import { XIcon } from "lucide-react";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetTitle,
} from "~/components/ui/sheet";
import {
  formSheetBodyClass,
  formSheetDescriptionClass,
  formSheetHeaderClass,
  formSheetMetaClass,
  formSheetTitleClass,
} from "~/components/ui/surface-styles";
import { cn } from "~/lib/utils";

type FormSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  meta?: React.ReactNode;
  children: React.ReactNode;
};

export function FormSheet({
  open,
  onOpenChange,
  title,
  description,
  meta,
  children,
}: FormSheetProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        hideClose
        className={cn(
          "flex h-full w-full flex-col gap-0 border-l border-border/60 p-0",
          "sm:max-w-xl"
        )}
      >
        <div className={formSheetHeaderClass}>
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1 pr-4">
              <SheetTitle className={formSheetTitleClass}>{title}</SheetTitle>
              {description ? (
                <SheetDescription className={formSheetDescriptionClass}>
                  {description}
                </SheetDescription>
              ) : null}
            </div>
            <SheetClose className="-mr-1 shrink-0 cursor-pointer rounded-md p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus:ring-[3px] focus:ring-ring/50 focus:outline-none">
              <XIcon className="size-[1.125rem] stroke-[1.75]" />
              <span className="sr-only">Close</span>
            </SheetClose>
          </div>
          {meta ? <div className={formSheetMetaClass}>{meta}</div> : null}
        </div>

        <div className={formSheetBodyClass}>{children}</div>
      </SheetContent>
    </Sheet>
  );
}
