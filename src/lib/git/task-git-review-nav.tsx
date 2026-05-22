import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export type TaskGitReviewLineFocus = {
  path: string;
  line: number;
  side: "LEFT" | "RIGHT";
};

type TaskGitReviewNavContextValue = {
  lineFocus: TaskGitReviewLineFocus | null;
  focusLineInDiff: (target: TaskGitReviewLineFocus) => void;
  clearLineFocus: () => void;
};

const TaskGitReviewNavContext =
  createContext<TaskGitReviewNavContextValue | null>(null);

export function TaskGitReviewNavProvider({
  children,
  onOpenDevelopment,
}: {
  children: ReactNode;
  onOpenDevelopment: () => void;
}) {
  const [lineFocus, setLineFocus] = useState<TaskGitReviewLineFocus | null>(
    null
  );

  const focusLineInDiff = useCallback(
    (target: TaskGitReviewLineFocus) => {
      onOpenDevelopment();
      setLineFocus(target);
    },
    [onOpenDevelopment]
  );

  const clearLineFocus = useCallback(() => setLineFocus(null), []);

  const value = useMemo(
    () => ({ lineFocus, focusLineInDiff, clearLineFocus }),
    [lineFocus, focusLineInDiff, clearLineFocus]
  );

  return (
    <TaskGitReviewNavContext.Provider value={value}>
      {children}
    </TaskGitReviewNavContext.Provider>
  );
}

export function useTaskGitReviewNav() {
  return useContext(TaskGitReviewNavContext);
}
