import * as React from "react";
import {
  BookOpen,
  Bot,
  Command,
  Flag,
  Folder,
  Frame,
  LifeBuoy,
  List,
  Map,
  PieChart,
  Send,
  Settings2,
  SquareTerminal,
} from "lucide-react";

import { NavMain } from "~/components/nav-main";
import { NavSettings } from "~/components/nav-settings";
import { NavSecondary } from "~/components/nav-secondary";
import { NavUser } from "~/components/nav-user";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "~/components/ui/sidebar";
import { UserButton } from "@clerk/tanstack-react-start";
import { ClientOnly } from "@tanstack/react-router";

const data = {
  navMain: [
    {
      title: "Projects",
      url: "#",
      icon: Folder,
      isActive: true,
      items: [
        {
          title: "All",
          url: "/tasks",
        },
      ],
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
  ],
};

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
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
        <ClientOnly>
          <UserButton
            showName={true}
            appearance={{
              elements: {
                avatarBox: "order-1",
                userButtonOuterIdentifier: "order-2",
              },
            }}
          />
        </ClientOnly>
      </SidebarFooter>
    </Sidebar>
  );
}
