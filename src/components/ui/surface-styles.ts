import { cn } from "~/lib/utils";

/** Shared surface styles for floating layers and flat controls. */

export const popoverSurfaceClass =
  "bg-popover text-popover-foreground rounded-lg border border-border/60 shadow-[var(--shadow-surface)]";

/** Above dialogs so portaled menus paint on top. */
export const floatingContentZClass = "z-[100]";

export const popoverSurfacePaddingClass = "p-1";

export const menuItemClass =
  "relative flex min-h-8 cursor-pointer items-center gap-2 rounded-md px-2.5 py-2 text-sm outline-hidden select-none focus:bg-muted focus:text-foreground data-[disabled=true]:pointer-events-none data-[disabled=true]:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4 [&_svg:not([class*='text-'])]:text-muted-foreground";

/** Command rows where the label is already a badge chip (e.g. label picker). */
export const menuItemBadgeClass =
  "relative flex min-h-0 cursor-pointer items-center gap-1.5 rounded-md px-2 py-1 text-sm outline-hidden select-none focus:bg-muted focus:text-foreground data-[disabled=true]:pointer-events-none data-[disabled=true]:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4 [&_svg:not([class*='text-'])]:text-muted-foreground";

export const menuItemDestructiveClass =
  "data-[variant=destructive]:text-destructive data-[variant=destructive]:focus:bg-destructive/10 data-[variant=destructive]:focus:text-destructive dark:data-[variant=destructive]:focus:bg-destructive/20 data-[variant=destructive]:*:[svg]:!text-destructive";

/** Labels above settings/form fields. */
export const formLabelClass =
  "text-sm font-medium leading-snug text-muted-foreground";

/** Text inputs and textareas in settings/forms. */
export const formFieldClass =
  "rounded-md border border-border bg-background text-base shadow-[var(--shadow-control)] transition-[color,box-shadow] outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 aria-invalid:border-destructive aria-invalid:ring-destructive/20 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm";

export const controlTriggerClass =
  "flex w-fit cursor-pointer items-center justify-between gap-1.5 rounded-sm border border-border bg-muted/30 px-2 py-1 text-sm whitespace-nowrap shadow-none transition-colors outline-none hover:bg-muted/50 focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 data-[placeholder]:text-muted-foreground [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4 [&_svg:not([class*='text-'])]:text-muted-foreground";

/** Task metadata fields (status, priority, due, sprint) — matches select `size="sm"`. */
export const fieldControlClass = cn(controlTriggerClass, "h-7 min-h-7 py-0");

export const overlayClass =
  "fixed inset-0 z-50 bg-black/40 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0";

export const modalContentClass =
  "rounded-lg border border-border/50 bg-background shadow-[var(--shadow-overlay)]";

/** Settings / form section cards (PageSection). */
export const formCardClass =
  "rounded-lg border border-border/60 bg-card text-card-foreground shadow-[var(--shadow-card)]";

export const formCardHeaderClass = "px-6 pt-5 pb-0";

export const formCardTitleClass = "text-base font-semibold leading-snug text-foreground";

export const formCardContentClass = "space-y-6 px-6 py-5";

export const formCardDescriptionClass = "text-sm text-muted-foreground";

export const formCardFooterClass =
  "flex border-t border-border/60 bg-muted/30 px-6 py-3";

/** Danger zone — soft red wash via opacity, destructive accents on chrome. */
export const formCardDangerClass =
  "rounded-lg border border-destructive/15 bg-red-50/40 text-card-foreground shadow-[var(--shadow-card)]";

export const formCardDangerTitleClass =
  "text-base font-semibold leading-snug text-destructive/80";

export const formCardDangerFooterClass =
  "flex border-t border-border/60 bg-red-50/55 px-6 py-3";
