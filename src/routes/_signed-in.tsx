import { Outlet, createFileRoute } from "@tanstack/react-router";
import { AppSidebar } from "~/components/app-sidebar";
import { SidebarInset, SidebarProvider } from "~/components/ui/sidebar";
import { SiteHeader } from "~/components/site-header";
import { useOrganizationCacheClear } from "~/hooks/organization-cache-clear";
import { authStateFn } from "~/db/queries";
import { useRouterState } from "@tanstack/react-router";
import { TopLoadingState } from "~/components/TopLoadingState";

export const Route = createFileRoute("/_signed-in")({
  component: PathlessLayoutComponent,
  beforeLoad: async () => await authStateFn(),
});

function PathlessLayoutComponent() {
  useOrganizationCacheClear();
  const routerState = useRouterState();

  return (
    <div className="[--header-height:calc(--spacing(14))]">
      <TopLoadingState isActive={routerState.isLoading} />
      <SidebarProvider className="flex flex-col">
        <SiteHeader />
        <div className="flex flex-1">
          <AppSidebar />
          <SidebarInset>
            <Outlet />
          </SidebarInset>
        </div>
      </SidebarProvider>
    </div>
  );
}
