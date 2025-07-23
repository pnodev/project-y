import * as React from "react";
import { Flag, Folder, FolderPlus, LucideIcon, Tag } from "lucide-react";

import { NavMain } from "~/components/nav-main";
import { NavSettings } from "~/components/nav-settings";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "~/components/ui/sidebar";
import { version } from "../../package.json";
import { useSuspenseQuery } from "@tanstack/react-query";
import { projectsQueryOptions } from "~/db/queries/projects";

type NavItem = {
  title: string;
  url: string;
  icon?: LucideIcon | string;
};

const data = {
  navMain: [
    {
      title: "Projects",
      url: "#",
      icon: Folder,
      isActive: true,
      items: [
        {
          title: "Add Project",
          url: "/projects/new",
          icon: FolderPlus,
        },
      ] as NavItem[],
    },
  ],
  // navSecondary: [
  //   {
  //     title: "Support",
  //     url: "#",
  //     icon: LifeBuoy,
  //   },
  //   {
  //     title: "Feedback",
  //     url: "#",
  //     icon: Send,
  //   },
  // ],
  settings: [
    {
      name: "Statuses",
      url: "/statuses",
      icon: Flag,
    },
    {
      name: "Labels",
      url: "/labels",
      icon: Tag,
    },
  ],
};

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const projectsQuery = useSuspenseQuery(projectsQueryOptions());

  data.navMain[0].items = [];
  data.navMain[0].items.push({
    title: "All",
    url: "/tasks",
    icon: Folder,
  });
  projectsQuery.data.forEach((project) => {
    data.navMain[0].items.push({
      title: project.name,
      url: `/tasks/${project.id}`,
      icon: project.logo || Folder,
    });
  });
  data.navMain[0].items.push({
    title: "Add Project",
    url: "/projects/new",
    icon: FolderPlus,
  });
  return (
    <Sidebar
      className="top-(--header-height) h-[calc(100svh-var(--header-height))]!"
      {...props}
    >
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <a href="#">
                <div className="bg-indigo-700 text-sidebar-primary-foreground flex aspect-square size-8 items-center justify-center rounded">
                  PY
                </div>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-medium">Project Y</span>
                  <span className="truncate text-xs">Enterprise</span>
                </div>
              </a>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={data.navMain} />
        <NavSettings settings={data.settings} />
        {/* <NavSecondary items={data.navSecondary} className="mt-auto" /> */}
      </SidebarContent>
      <SidebarFooter>
        <p className="text-xs text-gray-500 text-center">v{version}</p>
      </SidebarFooter>
    </Sidebar>
  );
}
