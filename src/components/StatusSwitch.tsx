import { Status } from "~/db/schema";
import { selectableColorDotClasses } from "./ColorSelect";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "./ui/select";
import { cn } from "~/lib/utils";

function StatusColorDot({
  color,
  className,
}: {
  color: keyof typeof selectableColorDotClasses;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "size-2 shrink-0 rounded-full",
        selectableColorDotClasses[color],
        className
      )}
      aria-hidden
    />
  );
}

function StatusLabel({ name }: { name: string }) {
  return <span className="truncate leading-none">{name}</span>;
}

export function StatusSwitch({
  status,
  statuses,
  onValueChange,
}: {
  status: Status;
  statuses: Status[];
  onValueChange: (statusId: string) => void;
}) {
  return (
    <Select value={status.id} onValueChange={onValueChange}>
      <SelectTrigger size="sm" className="capitalize">
        <span className="inline-flex min-w-0 items-center gap-1.5">
          <StatusColorDot color={status.color ?? "neutral"} />
          <StatusLabel name={status.name} />
        </span>
      </SelectTrigger>
      <SelectContent>
        {statuses.map((item) => (
          <SelectItem
            key={item.id}
            value={item.id}
            textValue={item.name}
            className="gap-1.5 capitalize"
            leading={
              <StatusColorDot color={item.color ?? "neutral"} />
            }
          >
            {item.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
