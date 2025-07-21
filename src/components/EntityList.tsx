import { cn } from "~/lib/utils";
import { ColorSelect, selectableColorClasses } from "./ColorSelect";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import { Button } from "./ui/button";
import {
  EllipsisVertical,
  LucideIcon,
  Pencil,
  Trash2,
  GripVertical,
} from "lucide-react";
import { FormEvent, useCallback, useState, useEffect } from "react";
import { Input } from "./ui/input";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { ClientOnly } from "@tanstack/react-router";

interface EntityListProps {
  children: React.ReactNode;
  items: Array<{ id: string; order: number; name: string }>;
  onReorder: (
    items: Array<{ id: string; order: number; name: string }>
  ) => void;
}

export function EntityList({ children, items, onReorder }: EntityListProps) {
  const sortedItems = items.sort((a, b) => a.order - b.order);
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;

    if (active.id !== over?.id) {
      const oldIndex = items.findIndex((item) => item.id === active.id);
      const newIndex = sortedItems.findIndex((item) => item.id === over?.id);
      onReorder(arrayMove(sortedItems, oldIndex, newIndex));
    }
  }

  return (
    <ClientOnly fallback={<ul className="grid gap-2">{children}</ul>}>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={sortedItems}
          strategy={verticalListSortingStrategy}
        >
          <ul className="grid gap-2">{children}</ul>
        </SortableContext>
      </DndContext>
    </ClientOnly>
  );
}

export function EntityListItem({
  name,
  description,
  color,
  id,
  handleDelete,
  handleUpdate,
  ...props
}: {
  name: string;
  description: string;
  color: (typeof selectableColorClasses)[keyof typeof selectableColorClasses];
  id: string;
  icon?: LucideIcon;
  handleDelete: () => void;
  handleUpdate: (data: {
    name: string;
    color: keyof typeof selectableColorClasses;
  }) => Promise<void>;
}) {
  const [isClient, setIsClient] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  const sortableProps = useSortable({ id });
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = sortableProps;

  const style = isClient
    ? {
        transform: CSS.Transform.toString(transform),
        transition,
      }
    : {};

  const handleUpdateCallback = useCallback(
    async (e: FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      setIsSaving(true);
      const formData = new FormData(e.currentTarget as HTMLFormElement);
      await handleUpdate({
        name: formData.get("name") as string,
        color: formData.get("color") as keyof typeof selectableColorClasses,
      });
      setIsSaving(false);
      setIsEditing(false);
    },
    [handleUpdate]
  );

  return (
    <li
      ref={isClient ? setNodeRef : undefined}
      style={style}
      className={cn(
        "col-span-1 flex rounded-md shadow-xs",
        isClient && isDragging && "opacity-50 z-50"
      )}
    >
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
            <form
              onSubmit={handleUpdateCallback}
              className="grid grid-cols-12 gap-2"
            >
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
        <div className="shrink-0 pr-2 flex items-center gap-1">
          {!isEditing && (
            <Button
              variant="ghost"
              size="icon"
              className={cn(isClient && "cursor-grab active:cursor-grabbing")}
              {...(isClient ? { ...attributes, ...listeners } : {})}
            >
              <GripVertical className="h-4 w-4" />
            </Button>
          )}
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
