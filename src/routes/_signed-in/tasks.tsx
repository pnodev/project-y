import { createFileRoute, Outlet } from "@tanstack/react-router";
import { Suspense, useCallback } from "react";

import { useUpdateTaskMutation } from "~/db/mutations/tasks";
import { UpdateTask } from "~/db/schema";
import { PageLayout } from "~/components/PageLayout";
import { useStatusesQuery } from "~/db/queries/statuses";
import { useLabelsQuery } from "~/db/queries/labels";
import { EndlessLoadingSpinner } from "~/components/EndlessLoadingSpinner";
import { useAllTasksQuery } from "~/db/queries/tasks";
import { fetchAllTasksBoardBundle } from "~/db/queries/bundles";
import { hydrateAllTasksBoardCache } from "~/db/queries/hydrate-query-cache";
import { TaskViewSortControls } from "~/components/views/TaskViewSortControls";
import { TaskViewSwitcher } from "~/components/views/TaskViewSwitcher";
import { TaskViewsContainer } from "~/components/views/TaskViewsContainer";
import { pageMeta } from "~/utils/seo";

export const Route = createFileRoute("/_signed-in/tasks")({
  loader: async ({ context }) => {
    const bundle = await fetchAllTasksBoardBundle();
    hydrateAllTasksBoardCache(context.queryClient, bundle);
  },
  head: () => ({
    meta: [...pageMeta("All Projects - Tasks")],
  }),
  component: RouteComponent,
});

function RouteComponent() {
  const tasksQuery = useAllTasksQuery();
  const statusesQuery = useStatusesQuery();
  const labelsQuery = useLabelsQuery();

  const updateTask = useUpdateTaskMutation();

  const handleUpdateTask = useCallback(
    async ({ id, statusId, projectId, sprintId }: UpdateTask) => {
      await updateTask({
        id,
        statusId,
        projectId,
        sprintId,
      });
    },
    [updateTask]
  );

  return (
    <PageLayout
      title="All Projects - Tasks"
      headerClassName="px-4"
      contentClassName="gap-2 px-4 pb-2"
      actions={
        <div className="flex gap-2">
          <TaskViewSortControls />
          <TaskViewSwitcher />
        </div>
      }
    >
      <div className="flex flex-col gap-2 h-full grow-0">
        <TaskViewsContainer
          tasks={tasksQuery.data}
          statuses={statusesQuery.data}
          labels={labelsQuery.data ?? []}
          location="all"
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
