import { ColorSelect } from "~/components/ColorSelect";
import { Label } from "~/components/ui/label";
import { Input } from "~/components/ui/input";

type EntityConfigCreateFieldsProps = {
  nameInputId: string;
  colorSelectId: string;
  namePlaceholder?: string;
};

export function EntityConfigCreateFields({
  nameInputId,
  colorSelectId,
  namePlaceholder = "Name",
}: EntityConfigCreateFieldsProps) {
  return (
    <div className="grid grid-cols-2 gap-4">
      <div className="grid gap-1.5">
        <Label htmlFor={nameInputId}>Name</Label>
        <Input
          id={nameInputId}
          type="text"
          name="name"
          placeholder={namePlaceholder}
          required
        />
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor={colorSelectId}>Color</Label>
        <ColorSelect
          name="color"
          variant="field"
          triggerId={colorSelectId}
        />
      </div>
    </div>
  );
}
