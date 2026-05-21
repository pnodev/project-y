import { useRef, useEffect, useState } from "react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { useCreateTaskMutation } from "~/db/mutations/tasks";
import { useStore } from "@tanstack/react-store";
import { TaskViewStore } from "./views/task-view-store";
import { SendHorizontal } from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "@tanstack/react-router";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import { useProjectsQuery } from "~/db/queries/projects";
import { cn } from "~/lib/utils";

export default function TaskQuickCreate({
  status,
  projectId,
  sprintId,
  onClose,
  variant = "column",
}: {
  status: string;
  projectId?: string;
  sprintId?: string;
  onClose: () => void;
  /** `list` aligns with list-view columns; `column` sits in board column footer. */
  variant?: "list" | "column";
}) {
  const createTask = useCreateTaskMutation();
  const projectsQuery = useProjectsQuery();
  const ref = useRef<HTMLInputElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const navigate = useNavigate();
  const quickCreateOpen = useStore(
    TaskViewStore,
    (state) => state.quickCreateOpenFor
  );
  const [isCtrlKeyPressed, setIsCtrlKeyPressed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(
    null
  );

  useEffect(() => {
    if (quickCreateOpen === status && ref.current) {
      ref.current.focus();
    }
  }, [quickCreateOpen, status]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const name = formData.get("name") as string;

    if (!name) {
      return;
    }

    if (!projectId && selectedProjectId === null) {
      toast.error("Please select a project first!");
      return;
    }

    setIsLoading(true);
    e.currentTarget.reset();
    const data = await createTask({
      name,
      statusId: status,
      projectId: (projectId || selectedProjectId)!,
      sprintId: sprintId || undefined,
    });
    toast.success("Task created successfully!", {
      action: projectId
        ? {
            label: "Open Task",
            onClick: () =>
              navigate({
                to: "/projects/$projectId/tasks/$taskId",
                params: { projectId, taskId: data.id },
              }),
          }
        : undefined,
    });
    setIsLoading(false);

    if (!isCtrlKeyPressed) {
      onClose();
    }

    setIsCtrlKeyPressed(false);
  };

  if (quickCreateOpen !== status) return null;

  return (
    <form
      ref={formRef}
      onSubmit={handleSubmit}
      className={cn(
        variant === "list" &&
          "border-b border-border/40 bg-muted/25 px-4 py-2.5",
        variant === "column" && "flex flex-col gap-2"
      )}
    >
      {!projectId ? (
        <Select onValueChange={(id) => setSelectedProjectId(id)}>
          <SelectTrigger className={cn("w-full", variant === "list" && "mb-2")}>
            <SelectValue placeholder="Select a project" />
          </SelectTrigger>
          <SelectContent>
            {projectsQuery.data.map((project) => (
              <SelectItem key={project.id} value={project.id}>
                {project.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      ) : null}
      <div className="flex gap-2">
        <Input
          ref={ref}
          name="name"
          placeholder="Task name"
          className="min-w-0 flex-1"
          disablePasswordManagers={true}
          onKeyDown={(e) => {
            if (e.key === "Escape") {
              onClose();
            } else if (e.ctrlKey && e.key === "Enter" && formRef.current) {
              formRef.current.requestSubmit();
            }
            setIsCtrlKeyPressed(e.ctrlKey);
          }}
          onKeyUp={() => setIsCtrlKeyPressed(false)}
        />
        <Button
          type="submit"
          size="icon"
          loading={isLoading}
          hideContentWhenLoading={true}
          aria-label="Create task"
        >
          <SendHorizontal />
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={onClose}>
          Cancel
        </Button>
      </div>
      <p className="mt-1.5 text-[10px] text-muted-foreground">
        <kbd>Ctrl</kbd> + <kbd>Enter</kbd> to create another without closing.
      </p>
    </form>
  );
}
