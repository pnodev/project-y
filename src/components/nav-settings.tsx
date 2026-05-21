import { Link, useRouterState } from "@tanstack/react-router";
import { type LucideIcon } from "lucide-react";

import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarSeparator,
} from "~/components/ui/sidebar";

function isNavPathActive(pathname: string, url: string) {
  return (
    pathname === url || pathname.startsWith(`${url}/`)
  );
}

export function NavSettings({
  settings,
}: {
  settings: {
    name: string;
    url: string;
    icon: LucideIcon;
  }[];
}) {
  const { location } = useRouterState();
  const pathname = location.pathname;

  return (
    <>
      <SidebarSeparator className="mx-0 my-2" />
      <SidebarGroup className="group-data-[collapsible=icon]:hidden py-1">
        <SidebarGroupLabel className="text-sidebar-foreground/45 mb-1.5 px-4 text-[11px] font-medium tracking-wider uppercase">
          Settings
        </SidebarGroupLabel>
        <SidebarMenu>
          {settings.map((item) => (
            <SidebarMenuItem key={item.name}>
              <SidebarMenuButton
                asChild
                isActive={isNavPathActive(pathname, item.url)}
                className="font-medium"
              >
                <Link to={item.url}>
                  <item.icon className="text-sidebar-foreground/50" />
                  <span>{item.name}</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarGroup>
    </>
  );
}
