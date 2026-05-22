import { cn } from "~/lib/utils";
import {
  listColumnLabels,
  listGridStyle,
  LIST_ROW_X,
  type ListColumnFlags,
} from "./list-view-layout";

export function ListColumnHeader({ flags }: { flags: ListColumnFlags }) {
  return (
    <div
      className={cn(
        "grid items-center gap-x-4 border-b border-border/50 bg-muted/40 text-xs font-medium text-muted-foreground",
        LIST_ROW_X,
        "py-2.5"
      )}
      style={listGridStyle(flags)}
    >
      {listColumnLabels().map((col) => (
        <span
          key={col.key}
          className={cn(
            col.key === "title" && "min-w-0",
            (col.key === "due" || col.key === "priority") && "text-right",
            col.key === "labels" && "min-w-0"
          )}
        >
          {col.label}
        </span>
      ))}
    </div>
  );
}
