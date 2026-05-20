import * as React from "react";
import {
  Building2,
  Clock,
  ClockFading,
  ClockPlus,
  Flag,
  Folder,
  FolderPlus,
  LucideIcon,
  Tag,
  User,
} from "lucide-react";

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
import { useProjectsQuery } from "~/db/queries/projects";
import { useSprintsQuery } from "~/db/queries/sprints";

type NavItem = {
  title: string;
  url: string;
  icon?: LucideIcon | string;
  highlighted?: boolean;
};

const settingsNav = [
  {
    name: "Account",
    url: "/settings/account",
    icon: User,
  },
  {
    name: "Organization",
    url: "/settings/organization",
    icon: Building2,
  },
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
];

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const projectsQuery = useProjectsQuery();
  const sprintsQuery = useSprintsQuery();

  const navMain = React.useMemo(() => {
    const projectItems: NavItem[] = [
      { title: "All", url: "/tasks", icon: Folder },
      ...projectsQuery.data.map((project) => ({
        title: project.name,
        url: `/projects/${project.id}/tasks`,
        icon: project.logo || Folder,
      })),
      { title: "Add Project", url: "/projects/new", icon: FolderPlus },
    ];

    const sprintItems: NavItem[] = [
      ...sprintsQuery.data.map((sprint) => ({
        title: sprint.name,
        url: `/sprints/${sprint.id}/tasks`,
        icon: Clock,
        highlighted: sprint.start < new Date() && sprint.end > new Date(),
      })),
      { title: "Add Sprint", url: "/sprints/new", icon: ClockPlus },
    ];

    return [
      {
        title: "Projects",
        url: "#",
        icon: Folder,
        isActive: true,
        items: projectItems,
      },
      {
        title: "Sprints",
        url: "#",
        icon: ClockFading,
        isActive: true,
        items: sprintItems,
      },
    ];
  }, [projectsQuery.data, sprintsQuery.data]);

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
                <img src="/logo.svg" alt="Project Y" className="size-8" />
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
        <NavMain items={navMain} title="Tasks" />
        <NavSettings settings={settingsNav} />
        {/* <NavSecondary items={data.navSecondary} className="mt-auto" /> */}
      </SidebarContent>
      <SidebarFooter>
        <p className="text-xs text-gray-500 text-center">v{version}</p>
      </SidebarFooter>
    </Sidebar>
  );
}
