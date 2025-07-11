import { useRef, useEffect } from "react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { SimpleCard } from "./ui/simple-card";
import { useCreateTaskMutation } from "~/db/mutations";

export default function TaskQuickCreate({
  isOpen,
  status,
  onClose,
}: {
  isOpen: boolean;
  status: string;
  onClose: () => void;
}) {
  const createTask = useCreateTaskMutation();
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (ref.current) {
      ref.current.focus();
    }
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const name = formData.get("name") as string;
    e.currentTarget.reset();

    if (!name) {
      return;
    }

    await createTask({ name, statusId: status });
    onClose();
  };

  if (!isOpen) return null;

  return (
    <form onSubmit={handleSubmit}>
      <SimpleCard>
        <Input
          ref={ref}
          name="name"
          placeholder="Enter task name"
          onKeyDown={(e) => {
            if (e.key === "Escape") {
              onClose();
            }
          }}
        />
        <Button type="submit">Create Task</Button>
      </SimpleCard>
    </form>
  );
}
