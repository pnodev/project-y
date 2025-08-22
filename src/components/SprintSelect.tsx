import { useUsersQuery } from "~/db/queries/users";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import { useState } from "react";
import { Button } from "./ui/button";
import { Check, ChevronsUpDown, Cross, X } from "lucide-react";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "./ui/command";
import { cn, getInitials } from "~/lib/utils";
import { Avatar, AvatarFallback, AvatarImage, AvatarList } from "./ui/avatar";
import { EndlessLoadingSpinner } from "./EndlessLoadingSpinner";
import { useSprintsQuery } from "~/db/queries/sprints";

type User = {
  id: string;
  name: string;
  avatar: string;
};

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

  return (
    <div className="flex gap-2">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            type="button"
            role="combobox"
            aria-expanded={open}
            className="cursor-pointer group"
          >
            {sprintsQuery.data.find((s) => s.id === selectedSprintId)?.name ||
              "Select Sprint"}
            <EndlessLoadingSpinner
              isActive={isAssigning}
              spinnerClassName="size-4"
            />
            <ChevronsUpDown className="opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[200px] p-0" align="start">
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
      <Button
        variant={"outline"}
        size={"icon"}
        onClick={() => onValueChange(null)}
      >
        <X />
      </Button>
      {currentSprint && currentSprint?.id !== selectedSprintId ? (
        <Button
          onClick={() => onValueChange(currentSprint.id)}
          variant={"secondary"}
        >
          Add to current sprint
        </Button>
      ) : null}
    </div>
  );
}
