import * as React from "react";
import { ChevronDownIcon, X } from "lucide-react";

import { fieldControlClass } from "~/components/ui/surface-styles";
import { cn } from "~/lib/utils";
import { Calendar } from "~/components/ui/calendar";
import { Input } from "~/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "~/components/ui/popover";

const DEFAULT_TIME = "00:00";

function formatTimeValue(date: Date) {
  const hours = date.getHours().toString().padStart(2, "0");
  const minutes = date.getMinutes().toString().padStart(2, "0");
  return `${hours}:${minutes}`;
}

export function DateTimePicker({
  date,
  setDate,
}: {
  date?: Date;
  setDate?: (date: Date | undefined) => void;
}) {
  const [open, setOpen] = React.useState(false);
  const formatTime = (d: Date) =>
    `${d.getHours().toString().padStart(2, "0")}:${d.getMinutes().toString().padStart(2, "0")}`;

  const [time, setTime] = React.useState(
    date ? formatTimeValue(date) : DEFAULT_TIME
  );

  React.useEffect(() => {
    setTime(date ? formatTimeValue(date) : DEFAULT_TIME);
  }, [date]);

  const handleClear = () => {
    setDate?.(undefined);
    setTime(DEFAULT_TIME);
    setOpen(false);
  };

  const handleTimeChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const [hours, minutes] = event.target.value.split(":").map(Number);
    if (date) {
      const updatedDate = new Date(date);
      updatedDate.setHours(hours, minutes);
      setDate?.(updatedDate);
    }
    setTime(event.target.value);
  };

  const handleDateSelect = (selectedDate: Date | undefined) => {
    if (selectedDate) {
      const [hours, minutes] = time.split(":").map(Number);
      selectedDate.setHours(hours, minutes);
    }
    setDate?.(selectedDate);
    setOpen(false);
  };

  const formattedDate = date
    ? new Intl.DateTimeFormat("de-DE", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        weekday: "short",
      }).format(date)
    : null;

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <Popover open={open} onOpenChange={setOpen}>
        <div
          className={cn(fieldControlClass, "inline-flex min-w-0 gap-0 p-0")}
          id="date-picker"
        >
          <PopoverTrigger asChild>
            <button
              type="button"
              className="flex min-w-0 flex-1 cursor-pointer items-center gap-1.5 border-0 bg-transparent px-2 outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
            >
              <span className="w-28 truncate text-left">
                {formattedDate ?? "Select date"}
              </span>
            </button>
          </PopoverTrigger>
          {date ? (
            <button
              type="button"
              onClick={handleClear}
              aria-label="Clear due date"
              className="text-muted-foreground hover:text-foreground mr-0.5 flex size-5 shrink-0 cursor-pointer items-center justify-center rounded-sm hover:bg-muted/60"
            >
              <X className="size-3.5" />
            </button>
          ) : null}
          <ChevronDownIcon className="text-muted-foreground mr-1.5 size-4 shrink-0 opacity-50" />
        </div>
        <PopoverContent className="w-auto overflow-hidden p-0" align="start">
          <Calendar
            mode="single"
            selected={date}
            captionLayout="dropdown"
            onSelect={handleDateSelect}
          />
        </PopoverContent>
      </Popover>
      {date ? (
        <Input
          type="time"
          id="time-picker"
          step="60"
          value={time}
          onChange={handleTimeChange}
          className={cn(fieldControlClass, "h-7 w-[5.5rem] py-0")}
          aria-label="Due time"
        />
      ) : null}
    </div>
  );
}
