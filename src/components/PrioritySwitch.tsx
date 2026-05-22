import { Priority, PRIORITY_VALUES } from "~/db/schema";
import { cn } from "~/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";

export function PrioritySwitch({
  priority,
  onValueChange,
}: {
  priority: Priority;
  onValueChange: (priority: Priority) => void;
}) {
  const priorityColorMap: Record<Priority, string> = {
    low: "text-blue-500",
    medium: "text-gray-800",
    high: "text-red-500",
    critical: "",
  };

  const triggerColor = priorityColorMap[priority] || "text-gray-500";

  return (
    <Select
      name="priority"
      defaultValue={priority}
      onValueChange={onValueChange}
    >
      <SelectTrigger
        size="sm"
        className={cn(
          triggerColor,
          "font-medium capitalize",
          priority === "critical" && "text-destructive"
        )}
      >
        <SelectValue placeholder="Select a priority" />
      </SelectTrigger>
      <SelectContent>
        {PRIORITY_VALUES.map((priority) => {
          const color = priorityColorMap[priority] || "text-gray-500";
          return (
            <SelectItem
              key={priority}
              value={priority}
              className={`${color} font-semibold capitalize`}
            >
              {priority}
            </SelectItem>
          );
        })}
      </SelectContent>
    </Select>
  );
}
