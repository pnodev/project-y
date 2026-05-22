import {
  createFileRoute,
  Link,
  Outlet,
  useParams,
} from "@tanstack/react-router";
import { Suspense, useCallback } from "react";
import { Settings } from "lucide-react";

import { useUpdateTaskMutation } from "~/db/mutations/tasks";
import { UpdateTask } from "~/db/schema";
import { PageLayout } from "~/components/PageLayout";
import { useStatusesQuery } from "~/db/queries/statuses";
import { useLabelsQuery } from "~/db/queries/labels";
import { useProjectQuery } from "~/db/queries/projects";
import { EndlessLoadingSpinner } from "~/components/EndlessLoadingSpinner";
import { useTasksQuery } from "~/db/queries/tasks";
import { fetchProjectBoardBundle } from "~/db/queries/bundles";
import { hydrateProjectBoardCache } from "~/db/queries/hydrate-query-cache";
import { Button } from "~/components/ui/button";
import { TaskViewSortControls } from "~/components/views/TaskViewSortControls";
import { TaskViewSwitcher } from "~/components/views/TaskViewSwitcher";
import { TaskViewsContainer } from "~/components/views/TaskViewsContainer";
import { projectEditSheetSearch } from "~/lib/form-sheet-search";

export const Route = createFileRoute("/_signed-in/projects/$projectId/tasks")({
  loader: async ({ context, params }) => {
    const { projectId } = params;
    const bundle = await fetchProjectBoardBundle({ data: { projectId } });
    hydrateProjectBoardCache(context.queryClient, projectId, bundle);
  },
  component: Home,
});

function Home() {
  const params = useParams({ from: Route.id });
  const tasksQuery = useTasksQuery(params.projectId);
  const projectQuery = useProjectQuery(params.projectId);
  const statusesQuery = useStatusesQuery();
  const labelsQuery = useLabelsQuery();

  const updateTask = useUpdateTaskMutation();

  const handleUpdateTask = useCallback(
    async ({ id, statusId, projectId, sprintId }: UpdateTask) => {
      await updateTask({
        id,
        statusId,
        projectId: projectId ?? params.projectId,
        sprintId,
      });
    },
    [updateTask, params.projectId]
  );

  return (
    <PageLayout
      title={
        projectQuery.data?.name ? `${projectQuery.data.name} - Tasks` : "Tasks"
      }
      headerClassName="px-4"
      contentClassName="gap-2 px-4 pb-2"
      actions={
        <div className="flex gap-2">
          <TaskViewSortControls />
          <TaskViewSwitcher />
          <Button size="sm" variant="outline" asChild>
            <Link
              {...projectEditSheetSearch(params.projectId)}
              title="Project settings"
            >
              <Settings />
            </Link>
          </Button>
        </div>
      }
    >
      <div className="flex flex-col gap-2 h-full grow-0">
        <TaskViewsContainer
          tasks={tasksQuery.data}
          projectId={params.projectId}
          statuses={statusesQuery.data}
          labels={labelsQuery.data ?? []}
          location="project"
          updateTask={handleUpdateTask}
        />
        <Suspense
          fallback={
            <div className="flex h-full items-center justify-center">
              <EndlessLoadingSpinner centered isActive={true} />
            </div>
          }
        >
          <Outlet />
        </Suspense>
      </div>
    </PageLayout>
  );
}
