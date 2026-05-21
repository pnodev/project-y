import * as React from "react";
import { ChevronDownIcon, X } from "lucide-react";

import { Button } from "~/components/ui/button";
import { Calendar } from "~/components/ui/calendar";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
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

  return (
    <div className="flex gap-1">
      <div className="flex flex-col gap-3">
        <Label htmlFor="date-picker" className="sr-only">
          Date
        </Label>
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              id="date-picker"
              className="w-36 justify-between font-normal"
            >
              {date
                ? new Intl.DateTimeFormat("de-DE", {
                    year: "numeric",
                    month: "2-digit",
                    day: "2-digit",
                    weekday: "short",
                  }).format(date)
                : "Select date"}
              <ChevronDownIcon />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto overflow-hidden p-0" align="start">
            <Calendar
              mode="single"
              selected={date}
              captionLayout="dropdown"
              onSelect={handleDateSelect}
            />
          </PopoverContent>
        </Popover>
      </div>
      {date ? (
        <div className="flex flex-col gap-3">
          <Label htmlFor="time-picker" className="sr-only">
            Time
          </Label>
          <Input
            type="time"
            id="time-picker"
            step="60"
            value={time}
            onChange={handleTimeChange}
            className="bg-background appearance-none [&::-webkit-calendar-picker-indicator]:hidden [&::-webkit-calendar-picker-indicator]:appearance-none"
          />
        </div>
      ) : null}
      {date ? (
        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={handleClear}
          aria-label="Clear due date"
        >
          <X />
        </Button>
      ) : null}
    </div>
  );
}
