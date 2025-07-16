import { cn } from "~/lib/utils";
import { ColorSelect, selectableColorClasses } from "./ColorSelect";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import { Button } from "./ui/button";
import { EllipsisVertical, LucideIcon, Pencil, Trash2 } from "lucide-react";
import { FormEvent, useCallback, useState } from "react";
import { Input } from "./ui/input";
import { useUpdateStatusMutation } from "~/db/mutations";

export function EntityList({ children }: { children: React.ReactNode }) {
  return <ul className="grid gap-2">{children}</ul>;
}

export function EntityListItem({
  name,
  description,
  color,
  id,
  handleDelete,
  ...props
}: {
  name: string;
  description: string;
  color: (typeof selectableColorClasses)[keyof typeof selectableColorClasses];
  id: string;
  icon?: LucideIcon;
  handleDelete: () => void;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const updateStatus = useUpdateStatusMutation();

  const handleUpdate = useCallback(
    async (e: FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      setIsSaving(true);
      const formData = new FormData(e.currentTarget);
      const name = formData.get("name");
      const color = formData.get(
        "color"
      ) as keyof typeof selectableColorClasses;
      e.currentTarget.reset();

      if (typeof name !== "string" || !name) return;

      await updateStatus({ id, name, color });
      setIsSaving(false);
      setIsEditing(false);
    },
    [updateStatus, id]
  );

  return (
    <li className="col-span-1 flex rounded-md shadow-xs">
      <div
        className={cn(
          "flex w-16 shrink-0 rounded-l-md text-white justify-center items-center",
          selectableColorClasses[color as keyof typeof selectableColorClasses]
        )}
      >
        {props.icon ? <props.icon /> : null}
      </div>
      <div className="flex flex-1 items-center justify-between truncate rounded-r-md border-t border-r border-b border-gray-200 bg-white">
        <div className="flex-1 truncate px-4 py-2 text-sm">
          {isEditing ? (
            <form onSubmit={handleUpdate} className="grid grid-cols-12 gap-2">
              <Input
                name="name"
                placeholder="Name"
                defaultValue={name}
                className="col-span-6"
              />
              <ColorSelect
                name="color"
                triggerClassNames="w-full col-span-4"
                value={color as keyof typeof selectableColorClasses}
              />
              <Button
                size={"sm"}
                variant="secondary"
                type="reset"
                onClick={() => setIsEditing(false)}
              >
                Cancel
              </Button>
              <Button
                loading={isSaving}
                hideContentWhenLoading={true}
                size={"sm"}
                type="submit"
              >
                Save
              </Button>
            </form>
          ) : (
            <>
              <p className="font-medium text-gray-900">{name}</p>
              <p className="text-gray-500">{description}</p>
            </>
          )}
        </div>
        <div className="shrink-0 pr-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <EllipsisVertical />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem asChild>
                <button
                  type="button"
                  className="w-full cursor-pointer"
                  onClick={() => setIsEditing(true)}
                >
                  <Pencil />
                  Edit
                </button>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <button
                  type="button"
                  className="w-full cursor-pointer"
                  onClick={() => handleDelete()}
                >
                  <Trash2 />
                  Delete
                </button>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </li>
  );
}
