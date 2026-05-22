import * as React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { XIcon } from "lucide-react";

import { cn } from "~/lib/utils";
import { modalContentClass, overlayClass } from "./surface-styles";
import { EndlessLoadingSpinner } from "../EndlessLoadingSpinner";
import { DialogFloatingPortalProvider } from "./dialog-floating-portal";

const FLOATING_CONTENT_SELECTOR =
  '[data-slot="popover-content"],[data-slot="select-content"],[data-slot="dropdown-menu-content"],[data-slot="command"],[data-slot="command-item"]';

function isFloatingContentTarget(target: EventTarget | null) {
  return (
    target instanceof Element && target.closest(FLOATING_CONTENT_SELECTOR) !== null
  );
}

function Dialog({
  modal = true,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Root>) {
  return <DialogPrimitive.Root data-slot="dialog" modal={modal} {...props} />;
}

function DialogTrigger({
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Trigger>) {
  return <DialogPrimitive.Trigger data-slot="dialog-trigger" {...props} />;
}

function DialogPortal({
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Portal>) {
  return <DialogPrimitive.Portal data-slot="dialog-portal" {...props} />;
}

function DialogClose({
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Close>) {
  return <DialogPrimitive.Close data-slot="dialog-close" {...props} />;
}

function DialogOverlay({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Overlay>) {
  return (
    <DialogPrimitive.Overlay
      data-slot="dialog-overlay"
      className={cn(
        overlayClass,
        className
      )}
      {...props}
    />
  );
}

const DialogContent = React.forwardRef<
  React.ComponentRef<typeof DialogPrimitive.Content>,
  React.ComponentProps<typeof DialogPrimitive.Content> & {
    showCloseButton?: boolean;
    size?: "large" | "normal";
    isLoading?: boolean;
  }
>(function DialogContent(
  {
    className,
    children,
    showCloseButton = true,
    size = "normal",
    isLoading,
    onInteractOutside,
    onPointerDownOutside,
    ...props
  },
  ref
) {
  return (
    <DialogPortal data-slot="dialog-portal">
      <DialogOverlay />
      <DialogPrimitive.Content
        ref={ref}
        data-slot="dialog-content"
        className={cn(
          modalContentClass,
          "relative data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 fixed top-[50%] left-[50%] z-50 grid w-full translate-x-[-50%] translate-y-[-50%] gap-4 p-6 duration-200",
          size === "normal"
            ? "max-w-[calc(100%-2rem)] overflow-hidden sm:max-w-lg"
            : "max-w-[calc(100%-5rem)] 2xl:max-w-[1510px] h-[calc(100vh-6rem)] overflow-visible",
          className
        )}
        style={{ gridTemplateRows: "auto 1fr auto" }}
        onInteractOutside={(event) => {
          if (isFloatingContentTarget(event.target)) {
            event.preventDefault();
          }
          onInteractOutside?.(event);
        }}
        onPointerDownOutside={(event) => {
          if (isFloatingContentTarget(event.target)) {
            event.preventDefault();
          }
          onPointerDownOutside?.(event);
        }}
        {...props}
      >
        <EndlessLoadingSpinner isActive={!!isLoading} centered hasBackdrop />
        <DialogFloatingPortalProvider>{children}</DialogFloatingPortalProvider>
        {showCloseButton && (
          <DialogPrimitive.Close
            data-slot="dialog-close"
            className="cursor-pointer ring-offset-background focus:ring-ring data-[state=open]:bg-accent data-[state=open]:text-muted-foreground absolute top-4 right-4 rounded-xs opacity-70 transition-opacity hover:opacity-100 focus:ring-2 focus:ring-offset-2 focus:outline-hidden disabled:pointer-events-none [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4"
          >
            <XIcon />
            <span className="sr-only">Close</span>
          </DialogPrimitive.Close>
        )}
      </DialogPrimitive.Content>
    </DialogPortal>
  );
});

function DialogHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="dialog-header"
      className={cn(
        "flex flex-col grow-0 gap-2 text-center sm:text-left",
        className
      )}
      {...props}
    />
  );
}

function DialogFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="dialog-footer"
      className={cn(
        "flex flex-col-reverse gap-2 sm:flex-row sm:justify-end",
        className
      )}
      {...props}
    />
  );
}

function DialogTitle({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Title>) {
  return (
    <DialogPrimitive.Title
      data-slot="dialog-title"
      className={cn("text-lg leading-none font-semibold", className)}
      {...props}
    />
  );
}

function DialogDescription({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Description>) {
  return (
    <DialogPrimitive.Description
      data-slot="dialog-description"
      className={cn("text-muted-foreground text-sm", className)}
      {...props}
    />
  );
}

export {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogOverlay,
  DialogPortal,
  DialogTitle,
  DialogTrigger,
};
