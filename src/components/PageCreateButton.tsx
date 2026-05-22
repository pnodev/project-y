import { Link, type LinkProps } from "@tanstack/react-router";
import type { LucideIcon } from "lucide-react";
import { Plus } from "lucide-react";
import { Button } from "~/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "~/components/ui/tooltip";
import { cn } from "~/lib/utils";

const pageCreateTriggerClass = "size-10 shrink-0 rounded-full";

export type PageCreateMenuItem = {
  label: string;
  icon?: LucideIcon;
} & Pick<LinkProps, "to" | "search" | "params">;

type PageCreateButtonProps = {
  label: string;
  className?: string;
} & Pick<LinkProps, "to" | "search" | "params">;

export function PageCreateButton({
  label,
  to,
  search,
  params,
  className,
}: PageCreateButtonProps) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="default"
          size="icon"
          className={cn(pageCreateTriggerClass, className)}
          asChild
        >
          <Link
            to={to}
            search={search}
            params={params}
            aria-label={label}
          >
            <Plus className="size-5" />
          </Link>
        </Button>
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}

type PageCreateMenuProps = {
  /** Accessible name for the trigger (e.g. "Create"). */
  label?: string;
  items: PageCreateMenuItem[];
  className?: string;
};

export function PageCreateMenu({
  label = "Create",
  items,
  className,
}: PageCreateMenuProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="default"
          size="icon"
          className={cn(pageCreateTriggerClass, className)}
          aria-label={label}
        >
          <Plus className="size-5" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <DropdownMenuItem key={item.label} asChild>
              <Link to={item.to} search={item.search} params={item.params}>
                {Icon ? <Icon /> : null}
                {item.label}
              </Link>
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
