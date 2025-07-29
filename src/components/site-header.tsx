import { OrganizationSwitcher, UserButton } from "@clerk/tanstack-react-start";
import { ClientOnly } from "@tanstack/react-router";
import { SidebarIcon } from "lucide-react";

import { SearchForm } from "~/components/search-form";
import { Button } from "~/components/ui/button";
import { Separator } from "~/components/ui/separator";
import { useSidebar } from "~/components/ui/sidebar";

export function SiteHeader() {
  const { toggleSidebar } = useSidebar();

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
          <OrganizationSwitcher
            afterSelectOrganizationUrl="/tasks"
            afterSelectPersonalUrl="/tasks"
            afterCreateOrganizationUrl="/tasks"
            afterLeaveOrganizationUrl="/tasks"
          />
        </ClientOnly>
        <SearchForm className="w-full sm:ml-auto sm:w-auto" />
        <ClientOnly>
          <UserButton
            showName={false}
            appearance={{
              elements: {
                avatarBox: "order-1",
                userButtonOuterIdentifier: "order-2",
              },
            }}
          />
        </ClientOnly>
      </div>
    </header>
  );
}
