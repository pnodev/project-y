import { createFileRoute, Link } from "@tanstack/react-router";
import { Clock, Folder, FolderPlus, ListTodo, Plus } from "lucide-react";

import { PageLayout } from "~/components/PageLayout";
import {
  PageSection,
  PageSectionContent,
} from "~/components/PageSection";
import { SprintStatus } from "~/components/SprintStatus";
import { Button } from "~/components/ui/button";
import { MetricTile, MetricTileGroup } from "~/components/ui/metric-tile";
import {
  fetchDashboardStats,
  useDashboardStatsQuery,
} from "~/db/queries/dashboard";
import { hydrateDashboardCache } from "~/db/queries/hydrate-query-cache";
import { useProjectsQuery } from "~/db/queries/projects";
import { useSprintsQuery } from "~/db/queries/sprints";
import { authClient } from "~/lib/auth-client";
import { cn, formatUserName } from "~/lib/utils";

export const Route = createFileRoute("/_signed-in/dashboard")({
  loader: async ({ context }) => {
    const stats = await fetchDashboardStats();
    hydrateDashboardCache(context.queryClient, stats);
  },
  head: () => ({
    meta: [{ title: "Dashboard" }],
  }),
  component: RouteComponent,
});

function RouteComponent() {
  const { data: session } = authClient.useSession();
  const statsQuery = useDashboardStatsQuery();
  const projectsQuery = useProjectsQuery();
  const sprintsQuery = useSprintsQuery();

  const user = session?.user;
  const authUser = user as { firstname?: string; lastname?: string } | undefined;
  const displayName =
    formatUserName(authUser?.firstname, authUser?.lastname) ||
    user?.name ||
    "there";

  const stats = statsQuery.data;
  const now = new Date();
  const isSprintActive = (start: Date, end: Date) => start < now && end > now;

  return (
    <PageLayout title="Dashboard">
      <p className="text-muted-foreground text-sm">
        Welcome back, {displayName}.
      </p>

      <MetricTileGroup>
        <MetricTile
          label="Total tasks"
          value={stats.totalTasks}
          description="Across all projects"
        />
        <MetricTile
          label="Unassigned"
          value={stats.unassignedTasks}
          description="Tasks without a status"
        />
        <MetricTile
          label="Overdue"
          value={stats.overdueTasks}
          description="Past due date"
          highlight={stats.overdueTasks > 0}
        />
        <MetricTile
          label="Active sprint"
          value={
            stats.activeSprint ? stats.activeSprintTaskCount : "—"
          }
          description={
            stats.activeSprint
              ? `${stats.activeSprint.name} · tasks in sprint`
              : "No sprint in progress"
          }
        />
      </MetricTileGroup>

      <div className="flex flex-wrap gap-2">
        <Button variant="outline" size="sm" asChild>
          <Link to="/tasks">
            <ListTodo />
            All tasks
          </Link>
        </Button>
        <Button variant="outline" size="sm" asChild>
          <Link to="/projects/new">
            <FolderPlus />
            Add project
          </Link>
        </Button>
        <Button variant="outline" size="sm" asChild>
          <Link to="/sprints/new">
            <Plus />
            Add sprint
          </Link>
        </Button>
      </div>

      <PageSection title="Projects">
        <PageSectionContent>
          {projectsQuery.data.length === 0 ? (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                No projects yet. Create one to start organizing tasks.
              </p>
              <Button variant="outline" size="sm" asChild>
                <Link to="/projects/new">
                  <FolderPlus />
                  Add project
                </Link>
              </Button>
            </div>
          ) : (
            <ul className="divide-y">
              {projectsQuery.data.map((project) => (
                <li key={project.id}>
                  <Link
                    to="/projects/$projectId/tasks"
                    params={{ projectId: project.id }}
                    className="flex items-center gap-3 py-3 text-sm font-medium transition-colors hover:text-primary"
                  >
                    {project.logo ? (
                      <img
                        src={project.logo}
                        alt=""
                        className="size-4 shrink-0 rounded-sm"
                      />
                    ) : (
                      <Folder className="text-muted-foreground size-4 shrink-0" />
                    )}
                    <span className="truncate">{project.name}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </PageSectionContent>
      </PageSection>

      <PageSection title="Sprints">
        <PageSectionContent>
          {sprintsQuery.data.length === 0 ? (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                No sprints yet. Plan your work in time-boxed iterations.
              </p>
              <Button variant="outline" size="sm" asChild>
                <Link to="/sprints/new">
                  <Plus />
                  Add sprint
                </Link>
              </Button>
            </div>
          ) : (
            <ul className="divide-y">
              {sprintsQuery.data.map((sprint) => {
                const active = isSprintActive(sprint.start, sprint.end);
                return (
                  <li key={sprint.id}>
                    <Link
                      to="/sprints/$sprintId/tasks"
                      params={{ sprintId: sprint.id }}
                      className={cn(
                        "flex flex-col gap-2 py-3 transition-colors hover:text-primary sm:flex-row sm:items-center sm:justify-between",
                        active && "rounded-md bg-primary/5 px-2 -mx-2"
                      )}
                    >
                      <span className="flex items-center gap-2 text-sm font-medium">
                        <Clock className="text-muted-foreground size-4 shrink-0" />
                        {sprint.name}
                        {active ? (
                          <span className="bg-primary/10 text-primary rounded px-1.5 py-0.5 text-xs font-normal">
                            Active
                          </span>
                        ) : null}
                      </span>
                      <SprintStatus sprint={sprint} />
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </PageSectionContent>
      </PageSection>
    </PageLayout>
  );
}
