import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "~/lib/utils";
import { LoadingSpinner } from "./loading-spinner";

const buttonVariants = cva(
  "inline-flex items-center cursor-pointer justify-center gap-2 whitespace-nowrap rounded-sm text-sm font-medium transition-colors disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive",
  {
    variants: {
      variant: {
        default:
          "border border-primary/80 bg-primary text-primary-foreground hover:border-primary/90 hover:bg-primary/90",
        destructive:
          "border border-destructive/80 bg-destructive text-white hover:border-destructive/90 hover:bg-destructive/90 focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40 dark:border-destructive/70 dark:bg-destructive/60",
        outline:
          "border border-border bg-background hover:bg-muted/60 hover:text-foreground",
        background:
          "border border-border bg-muted/40 text-foreground hover:bg-muted/60",
        secondary:
          "border border-border bg-secondary text-secondary-foreground hover:bg-secondary/80",
        ghost:
          "border border-transparent hover:border-border hover:bg-muted/60 hover:text-foreground",
        sunken:
          "border border-border bg-muted/50 text-foreground hover:bg-muted/70",
        link: "border border-transparent text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-9 px-4 py-2 has-[>svg]:px-3",
        sm: "h-8 gap-1.5 px-3 has-[>svg]:px-2.5",
        lg: "h-10 px-6 has-[>svg]:px-4",
        icon: "size-9",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

function Button({
  className,
  variant,
  size,
  asChild = false,
  children,
  icon: Icon,
  loading,
  hideContentWhenLoading,
  type = "button",
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean;
    loading?: boolean;
    hideContentWhenLoading?: boolean;
    icon?: React.ComponentType<{
      className?: string;
    }>;
  }) {
  const Comp = asChild ? Slot : "button";

  const content = (
    <>
      <LoadingSpinner
        className={hideContentWhenLoading ? "" : "-ml-1 mr-2"}
        isActive={!!loading}
      />
      {Icon && !loading ? <Icon className="-ml-1 mr-2 h-4 w-4" /> : null}
      {!hideContentWhenLoading || !loading ? children : null}
    </>
  );

  const mergedClassName = cn(buttonVariants({ variant, size }), className);

  return asChild ? (
    <Comp className={mergedClassName} type={type} {...props}>
      {children}
    </Comp>
  ) : (
    <Comp
      className={mergedClassName}
      type={type}
      {...props}
      disabled={loading || props.disabled}
    >
      {content}
    </Comp>
  );
}

export { Button, buttonVariants };
