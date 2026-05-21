import { ClientOnly, Link, useNavigate } from "@tanstack/react-router";
import { LogOut, Menu, User } from "lucide-react";
import { authClient } from "~/lib/auth-client";
import { SearchForm } from "~/components/search-form";
import { Button } from "~/components/ui/button";
import { useSidebar } from "~/components/ui/sidebar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "~/components/ui/avatar";
import { formatUserName, getUserInitials } from "~/lib/utils";

export function SiteHeader() {
  const { toggleSidebar } = useSidebar();
  const navigate = useNavigate();
  const { data: session } = authClient.useSession();

  const handleSignOut = async () => {
    await authClient.signOut();
    navigate({ to: "/sign-in/$" });
  };

  const user = session?.user;
  const authUser = user as { firstname?: string; lastname?: string } | undefined;
  const userFirstname = authUser?.firstname;
  const userLastname = authUser?.lastname;
  const userDisplayName = formatUserName(userFirstname, userLastname) || user?.name;
  const userInitials = getUserInitials({
    firstname: userFirstname,
    lastname: userLastname,
    name: user?.name,
  });

  return (
    <header className="bg-background sticky top-0 z-50 flex w-full items-center border-b">
      <div className="flex h-(--header-height) w-full items-center gap-2 px-4">
        <Button
          className="h-8 w-8"
          variant="ghost"
          size="icon"
          onClick={toggleSidebar}
        >
          <Menu />
        </Button>

        <SearchForm className="w-full sm:ml-auto sm:w-auto" />

        <ClientOnly>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="gap-2">
                <Avatar className="size-7">
                  <AvatarImage src={user?.image ?? undefined} alt={userDisplayName} />
                  <AvatarFallback>{userInitials}</AvatarFallback>
                </Avatar>
                <span className="hidden sm:inline max-w-[120px] truncate">
                  {userDisplayName}
                </span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel className="font-normal truncate">
                {user?.email}
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link to="/settings/account" className="flex items-center gap-2">
                  <User className="size-4" />
                  Account settings
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleSignOut}>
                <LogOut className="size-4" />
                Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </ClientOnly>
      </div>
    </header>
  );
}
