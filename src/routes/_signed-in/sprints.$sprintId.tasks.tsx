import { useParams } from "@tanstack/react-router";
import { Outlet } from "@tanstack/react-router";
import { Link } from "@tanstack/react-router";
import { createFileRoute } from "@tanstack/react-router";
import { useStore } from "@tanstack/react-store";
import { ArrowDownWideNarrow, ArrowUpNarrowWide, Settings } from "lucide-react";
import { Suspense, useCallback } from "react";
import { EndlessLoadingSpinner } from "~/components/EndlessLoadingSpinner";
import { PageLayout } from "~/components/PageLayout";
import { SprintStatus } from "~/components/SprintStatus";
import { Button } from "~/components/ui/button";
import { ButtonGroup } from "~/components/ui/button-group";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import {
  BoardViewStore,
  SortByType,
} from "~/components/views/board-view-store";
import { BoardView } from "~/components/views/BoardView";
import { useUpdateTaskMutation } from "~/db/mutations/tasks";
import { useSprintQuery } from "~/db/queries/sprints";
import { useStatusesQuery } from "~/db/queries/statuses";
import { useTasksForSprintQuery } from "~/db/queries/tasks";
import { UpdateTask } from "~/db/schema";

export const Route = createFileRoute("/_signed-in/sprints/$sprintId/tasks")({
  loader: async ({ context, params }) => {},
  component: RouteComponent,
});

function RouteComponent() {
  const params = useParams({ from: Route.id });
  const tasksQuery = useTasksForSprintQuery(params.sprintId);
  const sprintQuery = useSprintQuery(params.sprintId);
  const statusesQuery = useStatusesQuery();

  const updateTask = useUpdateTaskMutation();

  const handleUpdateTask = useCallback(
    async ({ id, statusId }: UpdateTask) => {
      await updateTask({
        id: id,
        statusId,
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
      title={
        sprintQuery.data?.name ? `${sprintQuery.data.name} - Tasks` : "Tasks"
      }
      actions={
        <div className="flex gap-2">
          {sprintQuery.data && <SprintStatus sprint={sprintQuery.data} />}
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
          <Button size={"sm"} variant={"outline"} asChild>
            <Link
              to={"/sprints/$sprintId/settings"}
              params={{ sprintId: params.sprintId }}
              title="Sprint Settings"
            >
              <Settings />
            </Link>
          </Button>
        </div>
      }
    >
      <div className="flex flex-col gap-2 h-full grow-0">
        <BoardView
          tasks={tasksQuery.data}
          sprintId={params.sprintId}
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
