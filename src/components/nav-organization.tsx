"use client";

import { ClientOnly, Link, useNavigate } from "@tanstack/react-router";
import { Building2, ChevronsUpDown, Plus, Settings } from "lucide-react";
import { authClient } from "~/lib/auth-client";
import { Avatar, AvatarFallback, AvatarImage } from "~/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "~/components/ui/sidebar";
import { getUserInitials } from "~/lib/utils";
import { useOrganizations } from "~/hooks/use-organizations";
import { toast } from "sonner";

/** Horizontal inset of the org menu from the sidebar edges */
const ORG_MENU_SIDEBAR_INSET = "0.75rem";

export function NavOrganization() {
  const navigate = useNavigate();
  const { data: session } = authClient.useSession();
  const { organizations, activeOrg, loadOrganizations } = useOrganizations();

  const user = session?.user;
  const authUser = user as { firstname?: string; lastname?: string } | undefined;
  const userInitials = getUserInitials({
    firstname: authUser?.firstname,
    lastname: authUser?.lastname,
    name: user?.name,
  });

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

  return (
    <ClientOnly>
      <SidebarMenu>
        <SidebarMenuItem>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <SidebarMenuButton
                size="lg"
                className="cursor-pointer rounded-none font-medium data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
              >
                {activeOrg?.logo ? (
                  <img
                    src={activeOrg.logo}
                    alt=""
                    className="size-8 shrink-0 rounded-md object-cover"
                  />
                ) : activeOrg ? (
                  <div className="bg-sidebar-accent flex size-8 shrink-0 items-center justify-center rounded-md">
                    <Building2 className="text-sidebar-foreground/60 size-4" />
                  </div>
                ) : (
                  <Avatar className="size-8 shrink-0 rounded-md">
                    <AvatarImage src={user?.image ?? undefined} alt="" />
                    <AvatarFallback className="rounded-md text-xs">
                      {userInitials}
                    </AvatarFallback>
                  </Avatar>
                )}
                <div className="grid min-w-0 flex-1 text-left leading-tight">
                  <span className="truncate text-sm font-medium">
                    {activeOrg?.name ?? "Personal"}
                  </span>
                  <span className="text-sidebar-foreground/55 truncate text-xs font-normal">
                    {activeOrg ? "Organization" : "Personal account"}
                  </span>
                </div>
                <ChevronsUpDown className="text-sidebar-foreground/45 ml-auto size-4 shrink-0" />
              </SidebarMenuButton>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              side="top"
              align="center"
              sideOffset={8}
              collisionPadding={12}
              className="min-w-52 rounded-lg shadow-md"
              style={{
                width: `calc(var(--radix-dropdown-menu-trigger-width) - ${ORG_MENU_SIDEBAR_INSET} * 2)`,
              }}
            >
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
                    {userInitials}
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
                  <Link
                    to="/settings/organization"
                    className="flex items-center gap-2"
                  >
                    <Settings className="size-4" />
                    Organization settings
                  </Link>
                </DropdownMenuItem>
              ) : null}
              <DropdownMenuItem asChild>
                <Link
                  to="/settings/organization"
                  search={{ sheet: "create-organization" }}
                  className="flex items-center gap-2"
                >
                  <Plus className="size-4" />
                  Create organization
                </Link>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </SidebarMenuItem>
      </SidebarMenu>
    </ClientOnly>
  );
}
