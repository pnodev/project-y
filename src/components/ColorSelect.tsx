import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { COLOR_VALUES } from "~/db/schema";

export function ColorSelect({ name }: { name: string }) {
  const colorClasses = {
    red: "bg-red-500",
    orange: "bg-orange-500",
    yellow: "bg-yellow-500",
    green: "bg-green-500",
    emerald: "bg-emerald-500",
    teal: "bg-teal-500",
    cyan: "bg-cyan-500",
    blue: "bg-blue-500",
    indigo: "bg-indigo-500",
    violet: "bg-violet-500",
    purple: "bg-purple-500",
    fuchsia: "bg-fuchsia-500",
    pink: "bg-pink-500",
    rose: "bg-rose-500",
    neutral: "bg-neutral-500",
  };

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
                  className={`${colorClasses[color]} inline-block w-4 h-4`}
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
