import { createFileRoute, Outlet } from "@tanstack/react-router";
import { Suspense, useCallback } from "react";
import { useStore } from "@tanstack/react-store";
import { ArrowDownWideNarrow, ArrowUpNarrowWide } from "lucide-react";

import { useUpdateTaskMutation } from "~/db/mutations/tasks";
import { BoardView } from "~/components/views/BoardView";
import { UpdateTask } from "~/db/schema";
import { PageLayout } from "~/components/PageLayout";
import { useStatusesQuery } from "~/db/queries/statuses";
import { useLabelsQuery } from "~/db/queries/labels";
import { EndlessLoadingSpinner } from "~/components/EndlessLoadingSpinner";
import { useAllTasksQuery } from "~/db/queries/tasks";
import { fetchAllTasksBoardBundle } from "~/db/queries/bundles";
import { hydrateAllTasksBoardCache } from "~/db/queries/hydrate-query-cache";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import { Button } from "~/components/ui/button";
import {
  BoardViewStore,
  SortByType,
} from "~/components/views/board-view-store";
import { ButtonGroup } from "~/components/ui/button-group";

export const Route = createFileRoute("/_signed-in/tasks")({
  loader: async ({ context }) => {
    const bundle = await fetchAllTasksBoardBundle();
    hydrateAllTasksBoardCache(context.queryClient, bundle);
  },
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

  const sortBy = useStore(BoardViewStore, (state) => state.sortBy);
  const sortDirection = useStore(
    BoardViewStore,
    (state) => state.sortDirection
  );
  const sortLabels = {
    due: "Due Date",
    created: "Created",
    updated: "Updated",
  };

  return (
    <PageLayout
      title="All Projects - Tasks"
      actions={
        <DropdownMenu>
          <ButtonGroup>
            <Button
              size={"sm"}
              variant="outline"
              title={
                sortDirection === "asc" ? "Sort Ascending" : "Sort Descending"
              }
              onClick={() =>
                BoardViewStore.setState((state) => {
                  return {
                    ...state,
                    sortDirection: sortDirection === "asc" ? "desc" : "asc",
                  };
                })
              }
            >
              {sortDirection === "desc" ? (
                <ArrowDownWideNarrow />
              ) : (
                <ArrowUpNarrowWide />
              )}
            </Button>
            <DropdownMenuTrigger asChild>
              <Button size={"sm"} variant="outline">
                {sortLabels[sortBy]}
              </Button>
            </DropdownMenuTrigger>
          </ButtonGroup>
          <DropdownMenuContent className="w-56">
            <DropdownMenuLabel>Sort Tasks by</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuRadioGroup
              value={sortBy}
              onValueChange={(value) =>
                BoardViewStore.setState((state) => {
                  return { ...state, sortBy: value as SortByType };
                })
              }
            >
              <DropdownMenuRadioItem value="due">
                Due Date
              </DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="created">
                Created Date
              </DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="updated">
                Updated Date
              </DropdownMenuRadioItem>
            </DropdownMenuRadioGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      }
    >
      <div className="flex flex-col gap-2 h-full grow-0">
        <BoardView
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
