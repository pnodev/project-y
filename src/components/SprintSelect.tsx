import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import { useState } from "react";
import { Button } from "./ui/button";
import { Check, ChevronsUpDown, X } from "lucide-react";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "./ui/command";
import { cn } from "~/lib/utils";
import { EndlessLoadingSpinner } from "./EndlessLoadingSpinner";
import { useSprintsQuery } from "~/db/queries/sprints";
import { fieldControlClass } from "./ui/surface-styles";

export function SprintSelect({
  selectedSprintId,
  isAssigning,
  onValueChange,
}: {
  selectedSprintId?: string;
  isAssigning: boolean;
  onValueChange: (sprintId: string | null) => void;
}) {
  const [open, setOpen] = useState(false);
  const sprintsQuery = useSprintsQuery();
  const currentSprint = sprintsQuery.data.find(
    (s) => s.start < new Date() && s.end > new Date()
  );
  const selectedName = sprintsQuery.data.find(
    (s) => s.id === selectedSprintId
  )?.name;

  return (
    <div className="flex min-w-0 flex-wrap items-center gap-1.5">
      <Popover open={open} onOpenChange={setOpen}>
        <div className={cn(fieldControlClass, "inline-flex min-w-0 gap-0 p-0")}>
          <PopoverTrigger asChild>
            <button
              type="button"
              role="combobox"
              aria-expanded={open}
              className="flex min-w-0 flex-1 cursor-pointer items-center gap-1.5 border-0 bg-transparent px-2 outline-none"
            >
              <span className="truncate text-left">
                {selectedName ?? "Select Sprint"}
              </span>
              <EndlessLoadingSpinner
                isActive={isAssigning}
                spinnerClassName="size-4 shrink-0"
              />
            </button>
          </PopoverTrigger>
          {selectedSprintId ? (
            <button
              type="button"
              onClick={(event) => {
                event.preventDefault();
                event.stopPropagation();
                onValueChange(null);
              }}
              aria-label="Clear sprint"
              className="text-muted-foreground hover:text-foreground mr-0.5 flex size-5 shrink-0 cursor-pointer items-center justify-center rounded-sm hover:bg-muted/60"
            >
              <X className="size-3.5" />
            </button>
          ) : null}
          <ChevronsUpDown className="text-muted-foreground mr-1.5 size-4 shrink-0 opacity-50" />
        </div>
        <PopoverContent
          className="w-[200px] p-0"
          align="start"
          onOpenAutoFocus={(event) => event.preventDefault()}
        >
          <Command>
            <CommandInput placeholder="Search sprints..." className="h-9" />
            <CommandList>
              <CommandEmpty>No sprint found.</CommandEmpty>
              <CommandGroup>
                {sprintsQuery.data.map((s) => (
                  <CommandItem
                    key={s.id}
                    value={s.id}
                    onSelect={(currentValue) => {
                      onValueChange(currentValue);
                      setOpen(false);
                    }}
                  >
                    {s.name}
                    <Check
                      className={cn(
                        "ml-auto",
                        selectedSprintId === s.id ? "opacity-100" : "opacity-0"
                      )}
                    />
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
      {currentSprint && currentSprint.id !== selectedSprintId ? (
        <Button
          onClick={() => onValueChange(currentSprint.id)}
          variant="secondary"
          size="sm"
          className="h-7 shrink-0 px-2 text-xs"
        >
          Add to current sprint
        </Button>
      ) : null}
    </div>
  );
}
