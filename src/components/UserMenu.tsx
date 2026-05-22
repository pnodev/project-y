import { Link } from "@tanstack/react-router";
import { ChevronDown, LogOut, User } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "~/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import { cn } from "~/lib/utils";

type UserMenuProps = {
  displayName?: string;
  email?: string;
  imageUrl?: string | null;
  initials: string;
  onSignOut: () => void | Promise<void>;
};

export function UserMenu({
  displayName,
  email,
  imageUrl,
  initials,
  onSignOut,
}: UserMenuProps) {
  const name = displayName?.trim() || "Account";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className={cn(
            "group flex cursor-pointer items-center gap-2 rounded-full py-1 pl-1 pr-2.5 transition-colors outline-none",
            "hover:bg-muted/60",
            "focus-visible:ring-[3px] focus-visible:ring-ring/50",
            "data-[state=open]:bg-muted/60"
          )}
        >
          <Avatar className="size-8 shadow-sm ring-2 ring-background">
            <AvatarImage src={imageUrl ?? undefined} alt={name} />
            <AvatarFallback className="bg-primary/15 text-xs font-semibold text-primary">
              {initials}
            </AvatarFallback>
          </Avatar>
          <span className="hidden max-w-36 truncate text-sm font-semibold tracking-[-0.01em] text-foreground sm:inline">
            {name}
          </span>
          <ChevronDown
            className={cn(
              "size-3.5 shrink-0 text-muted-foreground/80 transition-transform duration-200",
              "group-data-[state=open]:rotate-180"
            )}
          />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        sideOffset={6}
        className="w-64 overflow-hidden p-0"
      >
        <div className="border-b border-border/60 bg-muted/30 px-3 py-3">
          <div className="flex items-center gap-3">
            <Avatar className="size-10 ring-1 ring-border/60">
              <AvatarImage src={imageUrl ?? undefined} alt={name} />
              <AvatarFallback className="bg-primary/10 text-sm font-medium text-primary">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1 text-left">
              <p className="truncate text-sm font-semibold leading-snug text-foreground">
                {name}
              </p>
              {email ? (
                <p className="truncate text-xs text-muted-foreground">{email}</p>
              ) : null}
            </div>
          </div>
        </div>
        <div className="p-1">
          <DropdownMenuItem asChild>
            <Link
              to="/settings/account"
              className="flex w-full cursor-pointer items-center gap-2"
            >
              <User className="size-4" />
              Account settings
            </Link>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem variant="destructive" onSelect={() => void onSignOut()}>
            <LogOut className="size-4" />
            Sign out
          </DropdownMenuItem>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
