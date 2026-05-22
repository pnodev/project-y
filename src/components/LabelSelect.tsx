import { Label } from "~/db/schema";
import { Button } from "./ui/button";
import { Check, Plus } from "lucide-react";
import { useState } from "react";
import { LabelBadge } from "./ui/label-badge";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "./ui/command";
import { cn } from "~/lib/utils";

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

export function LabelSelect({
  labels,
  selectedLabels,
  onSelect,
}: {
  labels: Label[];
  selectedLabels: string[];
  onSelect: (labelIds: string[]) => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          role="combobox"
          aria-expanded={open}
          aria-label="Add label"
          className="size-8 shrink-0 border-border/60 p-0 shadow-none"
        >
          <Plus className="size-3.5" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        className="w-[220px] p-0"
        onOpenAutoFocus={(event) => event.preventDefault()}
      >
        <Command shouldFilter>
          <CommandInput placeholder="Search item..." className="h-9" />
          <CommandList>
            <CommandEmpty>No item found.</CommandEmpty>
            <CommandGroup>
              {labels.map((label) => (
                <CommandItem
                  key={label.id}
                  variant="badge"
                  value={label.name}
                  keywords={[label.name]}
                  onSelect={() => {
                    const labelId = label.id;
                    if (selectedLabels?.includes(labelId)) {
                      onSelect(selectedLabels.filter((v) => v !== labelId));
                    } else {
                      onSelect([...selectedLabels, labelId]);
                    }
                  }}
                >
                  <LabelBadge size="small" color={label.color || "neutral"}>
                    {label.name}
                  </LabelBadge>
                  <Check
                    className={cn(
                      "ml-auto",
                      selectedLabels?.includes(label.id)
                        ? "opacity-100"
                        : "opacity-0"
                    )}
                  />
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
