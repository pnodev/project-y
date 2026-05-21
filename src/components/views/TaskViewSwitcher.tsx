import { useStore } from "@tanstack/react-store";
import { LayoutGrid, List } from "lucide-react";
import { Button } from "~/components/ui/button";
import { ButtonGroup } from "~/components/ui/button-group";
import { useUpdateUserPreferencesMutation } from "~/db/mutations/user-preferences";
import { useUserPreferencesQuery } from "~/db/queries/user-preferences";
import type { TaskViewMode } from "~/db/schema";
import { TaskViewStore } from "./task-view-store";

export function TaskViewSwitcher() {
  const viewMode = useStore(TaskViewStore, (state) => state.viewMode);
  const preferencesQuery = useUserPreferencesQuery();
  const updatePreferences = useUpdateUserPreferencesMutation();

  const setViewMode = (mode: TaskViewMode) => {
    const previous = viewMode;
    TaskViewStore.setState((state) => ({ ...state, viewMode: mode }));
    void updatePreferences({ taskViewMode: mode }).catch(() => {
      TaskViewStore.setState((state) => ({
        ...state,
        viewMode: preferencesQuery.data.taskViewMode ?? previous,
      }));
    });
  };

  return (
    <ButtonGroup>
      <Button
        size="sm"
        variant={viewMode === "board" ? "default" : "outline"}
        title="Board view"
        onClick={() => setViewMode("board")}
      >
        <LayoutGrid />
      </Button>
      <Button
        size="sm"
        variant={viewMode === "list" ? "default" : "outline"}
        title="List view"
        onClick={() => setViewMode("list")}
      >
        <List />
      </Button>
    </ButtonGroup>
  );
}
