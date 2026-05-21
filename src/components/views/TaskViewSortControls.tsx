import { useStore } from "@tanstack/react-store";
import { ArrowDownWideNarrow, ArrowUpNarrowWide } from "lucide-react";
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
import { TaskViewStore, type SortByType } from "./task-view-store";

const sortLabels: Record<SortByType, string> = {
  due: "Due Date",
  created: "Created",
  updated: "Updated",
};

export function TaskViewSortControls() {
  const sortBy = useStore(TaskViewStore, (state) => state.sortBy);
  const sortDirection = useStore(
    TaskViewStore,
    (state) => state.sortDirection
  );

  return (
    <DropdownMenu>
      <ButtonGroup>
        <Button
          size="sm"
          variant="outline"
          title={
            sortDirection === "asc" ? "Sort Ascending" : "Sort Descending"
          }
          onClick={() =>
            TaskViewStore.setState((state) => ({
              ...state,
              sortDirection: sortDirection === "asc" ? "desc" : "asc",
            }))
          }
        >
          {sortDirection === "desc" ? (
            <ArrowDownWideNarrow />
          ) : (
            <ArrowUpNarrowWide />
          )}
        </Button>
        <DropdownMenuTrigger asChild>
          <Button size="sm" variant="outline">
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
            TaskViewStore.setState((state) => ({
              ...state,
              sortBy: value as SortByType,
            }))
          }
        >
          <DropdownMenuRadioItem value="due">Due Date</DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="created">
            Created Date
          </DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="updated">
            Updated Date
          </DropdownMenuRadioItem>
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
