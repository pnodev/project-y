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
