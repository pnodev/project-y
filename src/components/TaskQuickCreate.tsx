import { useRef, useEffect, useState } from "react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { SimpleCard } from "./ui/simple-card";
import { useCreateTaskMutation } from "~/db/mutations/tasks";
import { useStore } from "@tanstack/react-store";
import { BoardViewStore } from "./views/board-view-store";
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
import { DialogOverlay } from "@radix-ui/react-dialog";

export default function TaskQuickCreate({
  status,
  projectId,
  sprintId,
  onClose,
}: {
  status: string;
  projectId?: string;
  sprintId?: string;
  onClose: () => void;
}) {
  const createTask = useCreateTaskMutation();
  const projectsQuery = useProjectsQuery();
  const ref = useRef<HTMLInputElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const navigate = useNavigate();
  const quickCreateOpen = useStore(
    BoardViewStore,
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
  }, [quickCreateOpen]);

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

    setIsCtrlKeyPressed(false); // Reset after handling submit
  };

  if (quickCreateOpen !== status) return null;

  return (
    <form ref={formRef} onSubmit={handleSubmit}>
      <button onClick={onClose} type="button" className="fixed inset-0 z-50 ">
        <span className="sr-only">Close</span>
      </button>
      <SimpleCard className="relative z-50">
        {!projectId ? (
          <Select
            onValueChange={(projectId) => setSelectedProjectId(projectId)}
          >
            <SelectTrigger className="w-full">
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
        <div className="flex gap-1">
          <Input
            ref={ref}
            name="name"
            placeholder="Enter task name"
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
            size={"icon"}
            loading={isLoading}
            hideContentWhenLoading={true}
          >
            <SendHorizontal />
          </Button>
        </div>
        <p className="mt-1 text-[10px] text-muted-foreground">
          Press <kbd>Ctrl</kbd> + <kbd>Enter</kbd> to keep the dialog open.
        </p>
      </SimpleCard>
    </form>
  );
}
