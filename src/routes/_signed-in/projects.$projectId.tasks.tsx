import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, Outlet, useParams } from "@tanstack/react-router";
import { Suspense, useCallback } from "react";

import { useUpdateTaskMutation } from "~/db/mutations/tasks";

import { BoardView } from "~/components/views/BoardView";
import { Priority, UpdateTask } from "~/db/schema";
import { PageLayout } from "~/components/PageLayout";
import { statusesQueryOptions, useStatusesQuery } from "~/db/queries/statuses";
import { projectQueryOptions, useProjectQuery } from "~/db/queries/projects";
import { EndlessLoadingSpinner } from "~/components/EndlessLoadingSpinner";
import { tasksQueryOptions, useTasksQuery } from "~/db/queries/tasks";
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
  ArrowDownWideNarrow,
  ArrowUpNarrowWide,
  ArrowUpWideNarrow,
} from "lucide-react";
import { useStore } from "@tanstack/react-store";
import {
  BoardViewStore,
  SortByType,
} from "~/components/views/board-view-store";
import { ButtonGroup } from "~/components/ui/button-group";

export const Route = createFileRoute("/_signed-in/projects/$projectId/tasks")({
  loader: async ({ context, params }) => {
    const { projectId } = params;
    await context.queryClient.ensureQueryData(projectQueryOptions(projectId));
    await context.queryClient.ensureQueryData(tasksQueryOptions(projectId));
    await context.queryClient.ensureQueryData(statusesQueryOptions());
  },
  component: Home,
});

function Home() {
  const params = useParams({ from: Route.id });
  const tasksQuery = useTasksQuery(params.projectId);
  const projectQuery = useProjectQuery(params.projectId);
  const statusesQuery = useStatusesQuery();

  const updateTask = useUpdateTaskMutation();

  const handleUpdateTask = useCallback(
    async ({ id, statusId }: UpdateTask) => {
      await updateTask({
        id: id,
        statusId,
        projectId: params.projectId,
      });
    },
    [updateTask]
  );

  const priorityOrder: Priority[] = ["low", "medium", "high", "critical"];
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
      title={
        projectQuery.data?.name ? `${projectQuery.data.name} - Tasks` : "Tasks"
      }
      actions={
        <div>
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
        </div>
      }
    >
      <div className="flex flex-col gap-2 h-full grow-0">
        <BoardView
          priorityOrder={priorityOrder}
          tasks={tasksQuery.data}
          projectId={params.projectId}
          statuses={statusesQuery.data}
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
