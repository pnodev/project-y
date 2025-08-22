import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function getOwningIdentity(user: {
  userId: string | null;
  orgId: string | undefined | null;
}): string {
  if (user.orgId) {
    return user.orgId;
  }
  return user.userId as string;
}

export const getInitials = (name: string | undefined) => {
  if (!name) return "";
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .toUpperCase();
};

export const getFormattedDateString = (date: Date) => {
  return date.toLocaleDateString(undefined, {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
};

export function calculateTimeframePercentageDone(
  start: Date,
  end: Date
): number {
  const now = new Date();

  // Ensure valid dates
  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    throw new Error("Invalid start or end date provided.");
  }

  // Ensure start date is before or equal to end date
  if (start.getTime() > end.getTime()) {
    throw new Error("Start date cannot be after end date.");
  }

  const totalDurationMs = end.getTime() - start.getTime();

  // If the current date is before the start date, 0% is over.
  if (now.getTime() < start.getTime()) {
    return 0;
  }

  // If the current date is after the end date, 100% is over.
  if (now.getTime() >= end.getTime()) {
    return 100;
  }

  const elapsedDurationMs = now.getTime() - start.getTime();
  const percentage = (elapsedDurationMs / totalDurationMs) * 100;

  return parseFloat(percentage.toFixed(2)); // Round to 2 decimal places
}
