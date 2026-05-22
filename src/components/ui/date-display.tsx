export function DateDisplay({
  date,
  variant = "full",
}: {
  date: Date;
  variant?: "full" | "compact";
}) {
  if (variant === "compact") {
    return new Intl.DateTimeFormat("de-DE", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }).format(date);
  }

  return new Intl.DateTimeFormat("de-DE", {
    dateStyle: "full",
  }).format(date);
}
