"use client";

import { cloneElement, type ReactElement } from "react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "~/components/ui/tooltip";
import { tooltipContentClass } from "~/components/ui/surface-styles";
import { cn } from "~/lib/utils";

type TruncatedTooltipProps = {
  content: string;
  children: ReactElement<{ className?: string }>;
  side?: React.ComponentProps<typeof TooltipContent>["side"];
};

/**
 * Radix TooltipTrigger must attach to a DOM element. Composite components like
 * TaskViewLink do not forward trigger props, so we wrap children in a span.
 */
export function TruncatedTooltip({
  content,
  children,
  side = "top",
}: TruncatedTooltipProps) {
  const { className: childClassName, ...childProps } = children.props;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span
          className={cn("block min-w-0 max-w-full truncate", childClassName)}
        >
          {cloneElement(children, {
            ...childProps,
            className: "inline text-inherit",
          })}
        </span>
      </TooltipTrigger>
      <TooltipContent
        side={side}
        sideOffset={8}
        showArrow
        className={tooltipContentClass}
      >
        {content}
      </TooltipContent>
    </Tooltip>
  );
}
