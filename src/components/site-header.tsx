import { ClientOnly, Link, useNavigate } from "@tanstack/react-router";
import {
  Building2,
  ChevronsUpDown,
  LogOut,
  Plus,
  Settings,
  SidebarIcon,
  User,
} from "lucide-react";
import { authClient } from "~/lib/auth-client";
import { SearchForm } from "~/components/search-form";
import { Button } from "~/components/ui/button";
import { Separator } from "~/components/ui/separator";
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
import { formatUserName, getInitials } from "~/lib/utils";
import { useOrganizations } from "~/hooks/use-organizations";
import { toast } from "sonner";

export function SiteHeader() {
  const { toggleSidebar } = useSidebar();
  const navigate = useNavigate();
  const { data: session } = authClient.useSession();
  const { organizations, activeOrg, loadOrganizations } = useOrganizations();

  const handleSelectOrganization = async (organizationId: string) => {
    const { error } = await authClient.organization.setActive({
      organizationId,
    });

    if (error) {
      toast.error(error.message ?? "Failed to switch organization");
      return;
    }

    await loadOrganizations(organizationId);
    navigate({ to: "/dashboard" });
  };

  const handleSignOut = async () => {
    await authClient.signOut();
    navigate({ to: "/sign-in/$" });
  };

  const user = session?.user;
  const authUser = user as { firstname?: string; lastname?: string } | undefined;
  const userFirstname = authUser?.firstname;
  const userLastname = authUser?.lastname;
  const userDisplayName = formatUserName(userFirstname, userLastname) || user?.name;

  return (
    <header className="bg-background sticky top-0 z-50 flex w-full items-center border-b">
      <div className="flex h-(--header-height) w-full items-center gap-2 px-4">
        <Button
          className="h-8 w-8"
          variant="ghost"
          size="icon"
          onClick={toggleSidebar}
        >
          <SidebarIcon />
        </Button>
        <Separator orientation="vertical" className="mr-2 h-4" />

        <ClientOnly>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="gap-2">
                {activeOrg?.logo ? (
                  <img src={activeOrg.logo} alt="" className="size-4 rounded" />
                ) : activeOrg ? (
                  <Building2 className="size-4" />
                ) : (
                  <Avatar className="size-4">
                    <AvatarImage src={user?.image ?? undefined} alt="" />
                    <AvatarFallback className="text-[10px]">
                      {getInitials(userFirstname, userLastname)}
                    </AvatarFallback>
                  </Avatar>
                )}
                <span className="max-w-[140px] truncate">
                  {activeOrg?.name ?? "Personal"}
                </span>
                <ChevronsUpDown className="size-4 opacity-50" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-56">
              <DropdownMenuLabel>Organizations</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={async () => {
                  const { error } = await authClient.organization.setActive({
                    organizationId: null,
                  });
                  if (error) {
                    toast.error(error.message ?? "Failed to switch account");
                    return;
                  }
                  await loadOrganizations(null);
                  navigate({ to: "/dashboard" });
                }}
                className="gap-2"
              >
                <Avatar className="size-4">
                  <AvatarImage src={user?.image ?? undefined} alt="" />
                  <AvatarFallback className="text-[10px]">
                    {getInitials(userFirstname, userLastname)}
                  </AvatarFallback>
                </Avatar>
                Personal account
              </DropdownMenuItem>
              {organizations.map((org) => (
                <DropdownMenuItem
                  key={org.id}
                  onClick={() => void handleSelectOrganization(org.id)}
                  className="gap-2"
                >
                  {org.logo ? (
                    <img src={org.logo} alt="" className="size-4 rounded" />
                  ) : (
                    <Building2 className="size-4" />
                  )}
                  {org.name}
                </DropdownMenuItem>
              ))}
              <DropdownMenuSeparator />
              {activeOrg ? (
                <DropdownMenuItem asChild>
                  <Link to="/settings/organization" className="flex items-center gap-2">
                    <Settings className="size-4" />
                    Organization settings
                  </Link>
                </DropdownMenuItem>
              ) : null}
              <DropdownMenuItem asChild>
                <Link
                  to="/settings/organization/new"
                  className="flex items-center gap-2"
                >
                  <Plus className="size-4" />
                  Create organization
                </Link>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </ClientOnly>

        <SearchForm className="w-full sm:ml-auto sm:w-auto" />

        <ClientOnly>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="gap-2">
                <Avatar className="size-7">
                  <AvatarImage src={user?.image ?? undefined} alt={userDisplayName} />
                  <AvatarFallback>
                    {getInitials(userFirstname, userLastname)}
                  </AvatarFallback>
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
