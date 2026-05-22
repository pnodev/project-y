import * as React from "react"
import * as PopoverPrimitive from "@radix-ui/react-popover"

import { cn } from "~/lib/utils"
import {
  useDialogFloatingPortal,
  useIsInDialog,
} from "./dialog-floating-portal"
import { floatingContentZClass, popoverSurfaceClass } from "./surface-styles"

function Popover({
  modal,
  ...props
}: React.ComponentProps<typeof PopoverPrimitive.Root>) {
  const inDialog = useIsInDialog()
  return (
    <PopoverPrimitive.Root
      data-slot="popover"
      modal={modal ?? inDialog}
      {...props}
    />
  )
}

function PopoverTrigger({
  ...props
}: React.ComponentProps<typeof PopoverPrimitive.Trigger>) {
  return <PopoverPrimitive.Trigger data-slot="popover-trigger" {...props} />
}

function PopoverContent({
  className,
  align = "center",
  sideOffset = 4,
  ...props
}: React.ComponentProps<typeof PopoverPrimitive.Content>) {
  const dialogPortal = useDialogFloatingPortal()
  const inDialog = useIsInDialog()

  return (
    <PopoverPrimitive.Portal
      container={dialogPortal ?? undefined}
    >
      <PopoverPrimitive.Content
        data-slot="popover-content"
        align={align}
        sideOffset={sideOffset}
        className={cn(
          popoverSurfaceClass,
          floatingContentZClass,
          inDialog && "z-[300]",
          "pointer-events-auto isolate w-72 outline-hidden",
          className
        )}
        {...props}
      />
    </PopoverPrimitive.Portal>
  )
}

function PopoverAnchor({
  ...props
}: React.ComponentProps<typeof PopoverPrimitive.Anchor>) {
  return <PopoverPrimitive.Anchor data-slot="popover-anchor" {...props} />
}

export { Popover, PopoverTrigger, PopoverContent, PopoverAnchor }
