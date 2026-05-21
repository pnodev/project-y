import { useEffect } from "react";
import { useUserPreferencesQuery } from "~/db/queries/user-preferences";
import { TaskViewStore } from "./task-view-store";

export function useSyncTaskViewModeFromPreferences() {
  const preferencesQuery = useUserPreferencesQuery();

  useEffect(() => {
    TaskViewStore.setState((state) => ({
      ...state,
      viewMode: preferencesQuery.data.taskViewMode,
    }));
  }, [preferencesQuery.data.taskViewMode]);
}
