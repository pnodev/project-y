import { Link } from "@tanstack/react-router";
import { TaskViewStore } from "./task-view-store";
import { clearTaskSelectionState } from "./task-selection";
import type { TaskViewLocation } from "./task-view-types";

export function getTaskLinkTarget(
  location: TaskViewLocation,
  showSprint: boolean
): "project" | "sprint" | "all" {
  if (location === "all") return "all";
  return showSprint ? "project" : "sprint";
}

export function TaskViewLink({
  location,
  showSprint,
  projectId,
  sprintId,
  taskId,
  children,
  onSelectClick,
  className,
}: {
  location: TaskViewLocation;
  showSprint: boolean;
  projectId?: string;
  sprintId?: string | null;
  taskId: string;
  children: React.ReactNode;
  onSelectClick: (event: React.MouseEvent) => void;
  className?: string;
}) {
  const to = getTaskLinkTarget(location, showSprint);

  const handleClick = (e: React.MouseEvent) => {
    if (e.shiftKey || e.metaKey || e.ctrlKey) {
      e.preventDefault();
      onSelectClick(e);
      return;
    }
    if (TaskViewStore.state.selectedTaskIds.length > 0) {
      clearTaskSelectionState();
    }
  };

  if (to === "all") {
    return (
      <Link
        to="/tasks/$taskId"
        params={{ taskId }}
        className={className}
        onClick={handleClick}
      >
        {children}
      </Link>
    );
  }

  if (to === "project") {
    return (
      <Link
        to="/projects/$projectId/tasks/$taskId"
        params={{ projectId: projectId!, taskId }}
        className={className}
        onClick={handleClick}
      >
        {children}
      </Link>
    );
  }

  return (
    <Link
      to="/sprints/$sprintId/tasks/$taskId"
      params={{ sprintId: sprintId!, taskId }}
      className={className}
      onClick={handleClick}
    >
      {children}
    </Link>
  );
}
