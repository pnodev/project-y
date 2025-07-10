export function DateDisplay({ date }: { date: Date }) {
  return new Intl.DateTimeFormat("de-DE", {
    dateStyle: "full",
  }).format(date);
}
