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
