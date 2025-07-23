import { Label } from "~/db/schema";
import { Button } from "./ui/button";
import { Check, Plus } from "lucide-react";
import { useState } from "react";
import { Badge } from "./ui/badge";
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
          role="combobox"
          aria-expanded={open}
          className="justify-between"
        >
          <Plus />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[200px] p-0">
        <Command>
          <CommandInput placeholder="Search item..." className="h-9" />
          <CommandList>
            <CommandEmpty>No item found.</CommandEmpty>
            <CommandGroup>
              {labels.map((label) => (
                <CommandItem
                  key={label.id}
                  value={label.id}
                  onSelect={(currentValue) => {
                    if (selectedLabels?.includes(currentValue)) {
                      onSelect(
                        selectedLabels.filter((v) => v !== currentValue)
                      );
                    } else {
                      onSelect([...selectedLabels, currentValue]);
                    }
                  }}
                >
                  <Badge size="small" color={label.color || "neutral"}>
                    {label.name}
                  </Badge>
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
