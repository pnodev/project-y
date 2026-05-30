import { cn } from "~/lib/utils";
import { ColorSelect, selectableColorClasses } from "./ColorSelect";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Checkbox } from "./ui/checkbox";
import { Label } from "./ui/label";
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
    <ClientOnly fallback={<ul className="grid gap-3">{children}</ul>}>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={sortedItems}
          strategy={verticalListSortingStrategy}
        >
          <ul className="grid gap-3">{children}</ul>
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
  isClosing = false,
  showClosingFields = false,
  handleDelete,
  handleUpdate,
  ...props
}: {
  name: string;
  description: string;
  color: (typeof selectableColorClasses)[keyof typeof selectableColorClasses];
  id: string;
  isClosing?: boolean;
  showClosingFields?: boolean;
  icon?: LucideIcon;
  handleDelete: () => void;
  handleUpdate: (data: {
    name: string;
    color: keyof typeof selectableColorClasses;
    isClosing?: boolean;
  }) => Promise<void>;
}) {
  const [isClient, setIsClient] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const nameInputId = `entity-${id}-name`;
  const colorSelectId = `entity-${id}-color`;
  const closingCheckboxId = `entity-${id}-is-closing`;

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
        isClosing: showClosingFields
          ? formData.get("isClosing") === "on"
          : undefined,
      });
      setIsSaving(false);
      setIsEditing(false);
    },
    [handleUpdate, showClosingFields]
  );

  const colorClass =
    selectableColorClasses[color as keyof typeof selectableColorClasses];

  return (
    <li
      ref={isClient ? setNodeRef : undefined}
      style={style}
      className={cn(
        "overflow-hidden rounded-lg border border-border/60 bg-card shadow-card",
        isClient && isDragging && "z-50 opacity-50"
      )}
    >
      <div className="flex min-w-0">
        <div
          className={cn(
            "flex w-14 shrink-0 items-center justify-center text-white",
            colorClass
          )}
        >
          {props.icon ? <props.icon className="size-5" /> : null}
        </div>
        <div className="flex min-w-0 flex-1 items-center justify-between gap-2 py-2 pr-2 pl-4">
          <div className="min-w-0 flex-1">
            {isEditing ? (
              <form onSubmit={handleUpdateCallback} className="space-y-3">
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-1.5">
                    <Label htmlFor={nameInputId}>Name</Label>
                    <Input
                      id={nameInputId}
                      name="name"
                      defaultValue={name}
                      required
                    />
                  </div>
                  <div className="grid gap-1.5">
                    <Label htmlFor={colorSelectId}>Color</Label>
                    <ColorSelect
                      name="color"
                      variant="field"
                      triggerId={colorSelectId}
                      value={color as keyof typeof selectableColorClasses}
                    />
                  </div>
                </div>
                {showClosingFields ? (
                  <div className="flex items-start gap-3">
                    <Checkbox
                      id={closingCheckboxId}
                      name="isClosing"
                      defaultChecked={isClosing}
                    />
                    <div className="grid gap-1">
                      <Label htmlFor={closingCheckboxId}>Closing status</Label>
                      <p className="text-muted-foreground text-sm">
                        Tasks in this status are finished and no longer active.
                      </p>
                    </div>
                  </div>
                ) : null}
                <div className="flex justify-end gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    type="button"
                    onClick={() => setIsEditing(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    loading={isSaving}
                    hideContentWhenLoading
                    size="sm"
                    type="submit"
                  >
                    Save
                  </Button>
                </div>
              </form>
            ) : (
              <>
                <p className="flex items-center gap-2 truncate text-sm font-medium text-foreground">
                  <span className="truncate">{name}</span>
                  {showClosingFields && isClosing ? (
                    <Badge variant="secondary" className="shrink-0">
                      Closing
                    </Badge>
                  ) : null}
                </p>
                <p className="truncate text-sm text-muted-foreground">
                  {description}
                </p>
              </>
            )}
          </div>
          {!isEditing && (
            <div className="flex shrink-0 items-center gap-0.5">
              <Button
                variant="ghost"
                size="icon"
                className={cn(
                  "text-muted-foreground",
                  isClient && "cursor-grab active:cursor-grabbing"
                )}
                {...(isClient ? { ...attributes, ...listeners } : {})}
              >
                <GripVertical className="size-4" />
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="text-muted-foreground">
                    <EllipsisVertical className="size-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onSelect={() => setIsEditing(true)}>
                    <Pencil />
                    Edit
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    variant="destructive"
                    onSelect={() => handleDelete()}
                  >
                    <Trash2 />
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )}
        </div>
      </div>
    </li>
  );
}
