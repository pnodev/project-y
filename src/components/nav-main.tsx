"use client";

import { Link, useRouterState } from "@tanstack/react-router";
import { ChevronRight, type LucideIcon } from "lucide-react";

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "~/components/ui/collapsible";
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from "~/components/ui/sidebar";
import { getRouteApi } from "@tanstack/react-router";
import { cn } from "~/lib/utils";
import {
  type FormSheetSearch,
  isFormSheetNavItemActive,
} from "~/lib/form-sheet-search";

const signedInRoute = getRouteApi("/_signed-in");

function isNavPathActive(pathname: string, url: string) {
  if (url === "#") return false;
  return pathname === url || pathname.startsWith(`${url}/`);
}

function isAddItem(title: string) {
  return title.startsWith("Add ");
}

export function NavMain({
  title,
  items,
}: {
  title?: string;
  items: {
    title: string;
    url: string;
    icon: LucideIcon;
    items?: {
      title: string;
      url: string;
      search?: FormSheetSearch;
      icon?: LucideIcon | string;
      highlighted?: boolean;
    }[];
  }[];
}) {
  const { location } = useRouterState();
  const pathname = location.pathname;
  const routeSearch = signedInRoute.useSearch();

  return (
    <SidebarGroup className="py-1">
      {title ? (
        <SidebarGroupLabel className="text-sidebar-foreground/45 mb-1.5 px-4 text-[11px] font-medium tracking-wider uppercase">
          {title}
        </SidebarGroupLabel>
      ) : null}
      <SidebarMenu>
        {items.map((item) => {
          const hasChildren = Boolean(item.items?.length);
          if (!hasChildren) {
            return (
              <SidebarMenuItem key={item.url}>
                <SidebarMenuButton
                  asChild
                  isActive={
                    item.url === "/dashboard"
                      ? pathname === "/dashboard" && !routeSearch.sheet
                      : isNavPathActive(pathname, item.url)
                  }
                  className="font-medium"
                >
                  <Link to={item.url}>
                    <item.icon className="text-sidebar-foreground/50" />
                    <span>{item.title}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            );
          }

          return (
            <Collapsible
              key={`${item.url}-${item.title}`}
              defaultOpen
              className="group/collapsible"
            >
              <SidebarMenuItem>
                <CollapsibleTrigger asChild>
                  <SidebarMenuButton
                    className="pr-3 font-medium [&>svg:last-child]:transition-transform [&>svg:last-child]:duration-200 group-data-[state=open]/collapsible:[&>svg:last-child]:rotate-90"
                  >
                    <item.icon className="text-sidebar-foreground/50" />
                    <span className="flex-1">{item.title}</span>
                    <ChevronRight className="text-sidebar-foreground/45 size-4 shrink-0" />
                  </SidebarMenuButton>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <SidebarMenuSub>
                    {item.items?.map((subItem) => {
                      const active = isFormSheetNavItemActive(
                        pathname,
                        subItem.url,
                        subItem.search,
                        routeSearch
                      );
                      const isAction = isAddItem(subItem.title);
                      const logoUrl =
                        typeof subItem.icon === "string" ? subItem.icon : undefined;

                      return (
                        <SidebarMenuSubItem key={subItem.url}>
                          <SidebarMenuSubButton
                            asChild
                            isActive={active}
                            className={cn(
                              isAction &&
                                "font-normal text-muted-foreground hover:text-sidebar-foreground data-[active=true]:font-medium data-[active=true]:text-sidebar-primary"
                            )}
                          >
                            <Link to={subItem.url} search={subItem.search}>
                              {logoUrl ? (
                                <img
                                  src={logoUrl}
                                  className="size-4 shrink-0 rounded-sm"
                                  alt=""
                                />
                              ) : subItem.icon && !isAction ? (
                                <subItem.icon className="text-sidebar-foreground/45 size-4 shrink-0" />
                              ) : null}
                              <span className="flex-1">{subItem.title}</span>
                              {subItem.highlighted ? (
                                <span
                                  className="bg-sidebar-primary size-1.5 shrink-0 rounded-full"
                                  aria-hidden
                                />
                              ) : null}
                            </Link>
                          </SidebarMenuSubButton>
                        </SidebarMenuSubItem>
                      );
                    })}
                  </SidebarMenuSub>
                </CollapsibleContent>
              </SidebarMenuItem>
            </Collapsible>
          );
        })}
      </SidebarMenu>
    </SidebarGroup>
  );
}
