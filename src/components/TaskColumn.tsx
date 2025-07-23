import { Status } from "~/db/schema";
import { useDroppable } from "@dnd-kit/core";
import { cn } from "~/lib/utils";
import { Button } from "./ui/button";
import { PlusIcon } from "lucide-react";
import TaskQuickCreate from "./TaskQuickCreate";
import { useState } from "react";

export default function TaskColumn({
  status,
  projectId,
  numberOfTasks,
  children,
}: {
  status?: Status;
  projectId: string;
  numberOfTasks?: number;
  children: React.ReactNode;
}) {
  const [quickCreateOpen, setQuickCreateOpen] = useState(false);
  const { isOver, setNodeRef } = useDroppable({
    id: status ? `status:${status.id}` : "status-unassigned",
  });
  const colorClassesColumnBackground = {
    red: "bg-red-500",
    orange: "bg-orange-500",
    yellow: "bg-yellow-500",
    green: "bg-green-500",
    emerald: "bg-emerald-500",
    teal: "bg-teal-500",
    cyan: "bg-cyan-500",
    blue: "bg-blue-500",
    indigo: "bg-indigo-500",
    violet: "bg-violet-500",
    purple: "bg-purple-500",
    fuchsia: "bg-fuchsia-500",
    pink: "bg-pink-500",
    rose: "bg-rose-500",
    neutral: "bg-neutral-500",
  };
  const style = {
    background: isOver ? "var(--color-indigo-50)" : undefined,
  };
  return (
    <div
      className={cn(
        "rounded-sm h-full border flex flex-col gap-1.5 flex-1 min-w-[350px] max-w-[450px]",
        status ? "bg-slate-50" : "bg-yellow-100 border-yellow-300"
      )}
      ref={setNodeRef}
      style={style}
    >
      <h2
        className={cn(
          "mx-2 mt-1 px-1 font-semibold py-1 rounded-sm text-sm flex items-center"
        )}
      >
        <span
          className={cn(
            "mr-2 w-2.5 h-2.5 rounded-full block",
            colorClassesColumnBackground[status?.color || "neutral"]
          )}
        ></span>
        {status ? status.name : "Unassigned"}
        <span
          className={cn(
            "ml-3 text-[10px] inline-flex w-5 h-5 items-center justify-center rounded-full",
            status ? "bg-gray-300" : "bg-yellow-400 text-yellow-900"
          )}
        >
          {numberOfTasks}
        </span>
      </h2>
      <div className="px-1.5 pt-1 flex flex-col gap-1.5 overflow-y-auto flex-1">
        {children}
      </div>
      {status ? (
        <div className="p-2 gap-1 flex flex-col">
          <TaskQuickCreate
            status={status.id}
            projectId={projectId}
            isOpen={quickCreateOpen}
            onClose={() => setQuickCreateOpen(false)}
          />
          <Button
            size={"sm"}
            variant={"background"}
            type="button"
            onClick={() => setQuickCreateOpen(true)}
          >
            <PlusIcon />
            Add Task
          </Button>
        </div>
      ) : null}
    </div>
  );
}
