import { Outlet, createFileRoute } from "@tanstack/react-router";
import { AppSidebar } from "~/components/app-sidebar";
import { FormSheetsHost } from "~/components/EntityFormSheets";
import { SidebarInset, SidebarProvider } from "~/components/ui/sidebar";
import { SiteHeader } from "~/components/site-header";
import { signedInSearchSchema } from "~/lib/form-sheet-search";
import { useOrganizationCacheClear } from "~/hooks/organization-cache-clear";
import { fetchSidebarBundle } from "~/db/queries/bundles";
import { fetchUserPreferences } from "~/db/queries/user-preferences";
import {
  hydrateSidebarCache,
  hydrateUserPreferencesCache,
} from "~/db/queries/hydrate-query-cache";
import { useRouterState } from "@tanstack/react-router";
import { TopLoadingState } from "~/components/TopLoadingState";

export const Route = createFileRoute("/_signed-in")({
  validateSearch: signedInSearchSchema,
  loader: async ({ context }) => {
    const [bundle, preferences] = await Promise.all([
      fetchSidebarBundle(),
      fetchUserPreferences(),
    ]);
    hydrateSidebarCache(context.queryClient, bundle);
    hydrateUserPreferencesCache(context.queryClient, preferences);
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
              <FormSheetsHost />
            </SidebarInset>
          </div>
        </div>
      </SidebarProvider>
    </div>
  );
}
