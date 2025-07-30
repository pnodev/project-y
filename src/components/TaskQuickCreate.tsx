import { useRef, useEffect, useState } from "react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { SimpleCard } from "./ui/simple-card";
import { useCreateTaskMutation } from "~/db/mutations/tasks";
import { useStore } from "@tanstack/react-store";
import { BoardViewStore } from "./views/board-view-store";
import { SendHorizontal } from "lucide-react";

export default function TaskQuickCreate({
  status,
  projectId,
  onClose,
}: {
  status: string;
  projectId: string;
  onClose: () => void;
}) {
  const createTask = useCreateTaskMutation();
  const ref = useRef<HTMLInputElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const quickCreateOpen = useStore(
    BoardViewStore,
    (state) => state.quickCreateOpenFor
  );
  const [isCtrlKeyPressed, setIsCtrlKeyPressed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

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

    setIsLoading(true);
    e.currentTarget.reset();
    await createTask({ name, statusId: status, projectId });
    setIsLoading(false);

    if (!isCtrlKeyPressed) {
      onClose();
    }

    setIsCtrlKeyPressed(false); // Reset after handling submit
  };

  if (quickCreateOpen !== status) return null;

  return (
    <form ref={formRef} onSubmit={handleSubmit}>
      <button onClick={onClose} type="button" className="fixed inset-0 z-50">
        <span className="sr-only">Close</span>
      </button>
      <SimpleCard className="relative z-50">
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
