import { useUsersQuery } from "~/db/queries/users";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import { useState } from "react";
import { Button } from "./ui/button";
import { Check } from "lucide-react";
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

type User = {
  id: string;
  name: string;
  avatar: string;
};

export function UserSelect({
  selectedUserIds,
  isAssigning,
  onValueChange,
  emptyTriggerComponent,
  size = "md",
}: {
  selectedUserIds: string[];
  isAssigning: boolean;
  onValueChange: (userIds: string[]) => void;
  emptyTriggerComponent?: React.ReactNode;
  size?: "sm" | "md";
}) {
  const [open, setOpen] = useState(false);
  const usersQuery = useUsersQuery();

  const avatarSize = size === "sm" ? "size-5" : "size-7";

  return (
    <>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="sunken"
            size={"sm"}
            type="button"
            role="combobox"
            aria-expanded={open}
            className="cursor-pointer group"
          >
            <AvatarList>
              {selectedUserIds.length > 0
                ? selectedUserIds.map((userId) => {
                    const user = usersQuery.data.find((u) => u.id === userId);
                    if (!user) return null;
                    return (
                      <Avatar key={user.id} className={avatarSize}>
                        <AvatarImage src={user.avatar} alt={user.name} />
                        <AvatarFallback>
                          {getInitials(user.name)}
                        </AvatarFallback>
                      </Avatar>
                    );
                  })
                : emptyTriggerComponent || "Select an assignee..."}
              <EndlessLoadingSpinner
                isActive={isAssigning}
                spinnerClassName={avatarSize}
              />
            </AvatarList>
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[200px] p-0" align="start">
          <Command>
            <CommandInput placeholder="Search users..." className="h-9" />
            <CommandList>
              <CommandEmpty>No user found.</CommandEmpty>
              <CommandGroup>
                {usersQuery.data.map((u) => (
                  <CommandItem
                    key={u.id}
                    value={u.id}
                    onSelect={(currentValue) => {
                      if (selectedUserIds.includes(currentValue)) {
                        onValueChange(
                          selectedUserIds.filter((v) => v !== currentValue)
                        );
                      } else {
                        onValueChange([...selectedUserIds, currentValue]);
                      }
                    }}
                  >
                    <Avatar className="size-5">
                      <AvatarImage src={u.avatar} alt={u.name} />
                      <AvatarFallback>CN</AvatarFallback>
                    </Avatar>
                    {u.name}
                    <Check
                      className={cn(
                        "ml-auto",
                        selectedUserIds.includes(u.id)
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
    </>
  );
}
