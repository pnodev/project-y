import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { cn } from "~/lib/utils";
import { Color, COLOR_VALUES } from "~/db/schema";

/** Small dot swatch for status/label indicators (flat UI). */
export const selectableColorDotClasses = {
  red: "bg-red-600",
  orange: "bg-orange-600",
  yellow: "bg-yellow-600",
  green: "bg-green-600",
  emerald: "bg-emerald-600",
  teal: "bg-teal-600",
  cyan: "bg-cyan-600",
  blue: "bg-blue-600",
  indigo: "bg-indigo-600",
  violet: "bg-violet-600",
  purple: "bg-purple-600",
  fuchsia: "bg-fuchsia-600",
  pink: "bg-pink-600",
  rose: "bg-rose-600",
  neutral: "bg-neutral-500",
} as const;

export const selectableColorClasses = {
  red: "bg-red-600",
  orange: "bg-orange-600",
  yellow: "bg-yellow-600",
  green: "bg-green-600",
  emerald: "bg-emerald-600",
  teal: "bg-teal-600",
  cyan: "bg-cyan-600",
  blue: "bg-blue-600",
  indigo: "bg-indigo-600",
  violet: "bg-violet-600",
  purple: "bg-purple-600",
  fuchsia: "bg-fuchsia-600",
  pink: "bg-pink-600",
  rose: "bg-rose-600",
  neutral: "bg-neutral-600",
};

function ColorOption({ color }: { color: Color }) {
  return (
    <span className="flex min-w-0 items-center gap-2">
      <span
        className={cn(
          "size-4 shrink-0 rounded-sm",
          selectableColorClasses[color]
        )}
        aria-hidden
      />
      <span className="truncate capitalize">{color}</span>
    </span>
  );
}

export function ColorSelect({
  name,
  value,
  triggerClassNames,
  triggerId,
  variant = "control",
}: {
  name: string;
  value?: Color;
  triggerClassNames?: string;
  triggerId?: string;
  /** `field` — full-width settings form; `control` — compact inline/task UI */
  variant?: "control" | "field";
}) {
  return (
    <Select name={name} defaultValue={value}>
      <SelectTrigger
        id={triggerId}
        variant={variant}
        className={cn(
          variant === "field" && "w-full",
          variant === "control" && !triggerClassNames && "w-[300px]",
          "[&_[data-slot=select-value]]:flex [&_[data-slot=select-value]]:min-w-0 [&_[data-slot=select-value]]:items-center [&_[data-slot=select-value]]:gap-2",
          triggerClassNames
        )}
      >
        <SelectValue placeholder="Select a color" />
      </SelectTrigger>
      <SelectContent position="popper">
        {COLOR_VALUES.map((color) => (
          <SelectItem key={color} value={color}>
            <ColorOption color={color} />
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
