import { Link } from "@tanstack/react-router";
import { forwardRef, type ReactNode } from "react";
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

type TaskViewLinkProps = {
  location: TaskViewLocation;
  showSprint: boolean;
  projectId?: string;
  sprintId?: string | null;
  taskId: string;
  children: ReactNode;
  onSelectClick: (event: React.MouseEvent) => void;
  className?: string;
};

export const TaskViewLink = forwardRef<HTMLAnchorElement, TaskViewLinkProps>(
  function TaskViewLink(
    {
      location,
      showSprint,
      projectId,
      sprintId,
      taskId,
      children,
      onSelectClick,
      className,
    },
    ref
  ) {
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
          ref={ref}
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
          ref={ref}
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
        ref={ref}
        to="/sprints/$sprintId/tasks/$taskId"
        params={{ sprintId: sprintId!, taskId }}
        className={className}
        onClick={handleClick}
      >
        {children}
      </Link>
    );
  }
);
