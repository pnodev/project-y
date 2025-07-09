import { Status } from "~/db/schema";
import { useDroppable } from "@dnd-kit/core";

export default function TaskColumn({
  status,
  children,
}: {
  status: Status;
  children: React.ReactNode;
}) {
  const { isOver, setNodeRef } = useDroppable({
    id: `status:${status.id}`,
  });
  const style = {
    background: isOver ? "var(--color-indigo-50)" : undefined,
  };
  return (
    <div
      className="border p-2 flex flex-col gap-2 flex-1 min-w-[250px]"
      ref={setNodeRef}
      style={style}
    >
      <h2 className="text-xl font-bold">{status.name}</h2>
      {children}
    </div>
  );
}
