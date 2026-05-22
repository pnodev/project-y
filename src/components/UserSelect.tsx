import { useUsersQuery } from "~/db/queries/users";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import { useMemo, useState } from "react";
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

export function UserSelect({
  selectedUserIds,
  isAssigning,
  onValueChange,
  emptyTriggerComponent,
  size = "md",
  variant = "default",
}: {
  selectedUserIds: string[];
  isAssigning: boolean;
  onValueChange: (userIds: string[]) => void;
  emptyTriggerComponent?: React.ReactNode;
  size?: "sm" | "md";
  variant?: "default" | "inline" | "bare";
}) {
  const [open, setOpen] = useState(false);
  const usersQuery = useUsersQuery();

  const avatarSize = size === "sm" ? "size-6" : "size-7";
  const usersById = useMemo(() => {
    const map = new Map<string, (typeof usersQuery.data)[number]>();
    for (const user of usersQuery.data ?? []) {
      map.set(user.id, user);
    }
    return map;
  }, [usersQuery.data]);

  const primaryUser = selectedUserIds[0]
    ? usersById.get(selectedUserIds[0])
    : undefined;
  const extraCount = selectedUserIds.length - 1;

  const inlineTrigger = (
    <span className="inline-flex min-w-0 max-w-full items-center gap-2">
      {primaryUser ? (
        <>
          <Avatar className="size-7 shrink-0">
            <AvatarImage
              src={primaryUser.avatar || undefined}
              alt={primaryUser.name}
            />
            <AvatarFallback className="text-[10px]">
              {getInitials(primaryUser.name)}
            </AvatarFallback>
          </Avatar>
          <span className="min-w-0 truncate text-left text-sm text-foreground/90">
            {primaryUser.name}
            {extraCount > 0 ? (
              <span className="text-muted-foreground"> +{extraCount}</span>
            ) : null}
          </span>
        </>
      ) : (
        (emptyTriggerComponent ?? (
          <span className="text-xs text-muted-foreground">Assign</span>
        ))
      )}
      <EndlessLoadingSpinner
        isActive={isAssigning}
        spinnerClassName="size-4"
      />
    </span>
  );

  const avatarTrigger = (
    <span className="inline-flex min-w-0 items-center gap-1.5">
      {selectedUserIds.length > 0 ? (
        <AvatarList
          className={cn(
            "-space-x-2 *:data-[slot=avatar]:ring-2 *:data-[slot=avatar]:ring-background",
            size === "sm" && "-space-x-1.5"
          )}
        >
          {selectedUserIds.map((userId) => {
            const user = usersById.get(userId);
            if (!user) return null;
            return (
              <Avatar key={user.id} className={avatarSize}>
                <AvatarImage
                  src={user.avatar || undefined}
                  alt={user.name}
                />
                <AvatarFallback className="text-[10px]">
                  {getInitials(user.name)}
                </AvatarFallback>
              </Avatar>
            );
          })}
        </AvatarList>
      ) : (
        (emptyTriggerComponent ?? (
          <span className="text-muted-foreground text-xs">Unassigned</span>
        ))
      )}
      <EndlessLoadingSpinner
        isActive={isAssigning}
        spinnerClassName="size-4"
      />
    </span>
  );

  const defaultTrigger = avatarTrigger;

  const triggerContent =
    variant === "inline"
      ? inlineTrigger
      : variant === "bare"
        ? avatarTrigger
        : defaultTrigger;

  const bareTrigger = (
    <button
      type="button"
      role="combobox"
      aria-expanded={open}
      className="inline-flex cursor-pointer items-center rounded-sm border-0 bg-transparent p-0 outline-none transition-opacity hover:opacity-80 focus-visible:ring-[3px] focus-visible:ring-ring/50"
    >
      {triggerContent}
    </button>
  );

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        {variant === "bare" ? (
          bareTrigger
        ) : (
          <Button
            variant={variant === "inline" ? "ghost" : "sunken"}
            size="sm"
            type="button"
            role="combobox"
            aria-expanded={open}
            className={cn(
              "group cursor-pointer",
              variant === "default" &&
                "h-7 max-w-full items-center justify-start gap-1.5 px-2 py-0",
              variant === "inline" &&
                "h-auto max-w-full justify-start px-1.5 py-1 font-normal hover:bg-muted/80"
            )}
          >
            {triggerContent}
          </Button>
        )}
      </PopoverTrigger>
      <PopoverContent
        className="w-[200px] p-0"
        align="start"
        onOpenAutoFocus={(event) => event.preventDefault()}
      >
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
                    <AvatarImage src={u.avatar || undefined} alt={u.name} />
                    <AvatarFallback className="text-[10px]">
                      {getInitials(u.name)}
                    </AvatarFallback>
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
  );
}
