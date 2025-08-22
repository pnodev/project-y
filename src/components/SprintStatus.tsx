import { Calendar } from "lucide-react";
import { Sprint } from "~/db/schema";
import {
  calculateTimeframePercentageDone,
  cn,
  getFormattedDateString,
} from "~/lib/utils";
import { Progress } from "./ui/progress";

export function SprintStatus({ sprint }: { sprint: Sprint }) {
  // define a new constant percentageComplete that calculates the percentage of tasks completed in the sprint, based on the current date and end date
  const percentageComplete = calculateTimeframePercentageDone(
    sprint.start,
    sprint.end
  );

  return (
    <div className="flex items-center gap-2">
      <Progress value={percentageComplete} className="w-[130px]" />
      <DateDisplay className="w-[130px]" date={sprint.start} /> -
      <DateDisplay className="w-[130px]" date={sprint.end} />
    </div>
  );
}

const DateDisplay = ({
  date,
  className,
}: {
  date: Date;
  className?: string;
}) => {
  return (
    <div className={cn("relative flex w-full items-center gap-2", className)}>
      <Calendar className="text-muted-foreground pointer-events-none absolute left-2.5 size-4 select-none" />
      <input
        className="placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground dark:bg-input/30 border-input flex h-8 w-full min-w-0 rounded-md border bg-transparent px-3 py-1 text-base shadow-xs transition-[color,box-shadow] outline-none disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive appearance-none pl-8 [&::-webkit-calendar-picker-indicator]:hidden [&::-webkit-calendar-picker-indicator]:appearance-none"
        type="text"
        readOnly
        value={getFormattedDateString(date)}
      />
    </div>
  );
};
