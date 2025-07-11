import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { COLOR_VALUES } from "~/db/schema";

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

export function ColorSelect({ name }: { name: string }) {
  return (
    <>
      <Select name={name}>
        <SelectTrigger className="w-[300px]">
          <SelectValue placeholder="Select a color" />
        </SelectTrigger>
        <SelectContent>
          {COLOR_VALUES.map((color) => {
            return (
              <SelectItem key={color} value={color}>
                <span
                  className={`${selectableColorClasses[color]} inline-block w-4 h-4`}
                ></span>
                {color}
              </SelectItem>
            );
          })}
        </SelectContent>
      </Select>
    </>
  );
}
