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
        <StatusColorDot color={status.color ?? "neutral"} />
        <span className="truncate">{status.name}</span>
      </SelectTrigger>
      <SelectContent>
        {statuses.map((item) => (
          <SelectItem
            key={item.id}
            value={item.id}
            textValue={item.name}
            className="capitalize"
          >
            <span className="flex items-center gap-1.5">
              <StatusColorDot color={item.color ?? "neutral"} />
              {item.name}
            </span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
