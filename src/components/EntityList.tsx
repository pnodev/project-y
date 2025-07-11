import { cn } from "~/lib/utils";
import { selectableColorClasses } from "./ColorSelect";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import { Button } from "./ui/button";
import { EllipsisVertical, LucideIcon, Trash2 } from "lucide-react";

export function EntityList({ children }: { children: React.ReactNode }) {
  return <ul className="grid gap-2">{children}</ul>;
}

export function EntityListItem({
  name,
  description,
  color,
  handleDelete,
  ...props
}: {
  name: string;
  description: string;
  color: (typeof selectableColorClasses)[keyof typeof selectableColorClasses];
  icon?: LucideIcon;
  handleDelete: () => void;
}) {
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
          <p className="font-medium text-gray-900">{name}</p>
          <p className="text-gray-500">{description}</p>
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
