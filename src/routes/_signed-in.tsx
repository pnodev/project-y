import { Outlet, createFileRoute } from "@tanstack/react-router";
import { AppSidebar } from "~/components/app-sidebar";
import { SidebarInset, SidebarProvider } from "~/components/ui/sidebar";
import { SiteHeader } from "~/components/site-header";
import { useOrganizationCacheClear } from "~/hooks/organization-cache-clear";
import { fetchSidebarBundle } from "~/db/queries/bundles";
import { hydrateSidebarCache } from "~/db/queries/hydrate-query-cache";
import { useRouterState } from "@tanstack/react-router";
import { TopLoadingState } from "~/components/TopLoadingState";

export const Route = createFileRoute("/_signed-in")({
  loader: async ({ context }) => {
    const bundle = await fetchSidebarBundle();
    hydrateSidebarCache(context.queryClient, bundle);
  },
  component: PathlessLayoutComponent,
});

function PathlessLayoutComponent() {
  useOrganizationCacheClear();
  const routerState = useRouterState();

  return (
    <div className="[--header-height:calc(--spacing(14))]">
      <TopLoadingState isActive={routerState.isLoading} />
      <SidebarProvider className="flex min-h-svh overflow-x-hidden">
        <div className="flex min-w-0 flex-1">
          <AppSidebar />
          <div className="flex min-w-0 flex-1 flex-col">
            <SiteHeader />
            <SidebarInset className="min-w-0 flex-1">
              <Outlet />
            </SidebarInset>
          </div>
        </div>
      </SidebarProvider>
    </div>
  );
}
