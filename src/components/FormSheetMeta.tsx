export function FormSheetMetaItem({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <span className="inline-flex min-w-0 items-center gap-1.5 leading-5">
      <span className="font-normal text-muted-foreground">{label}</span>
      <span className="truncate font-medium text-foreground">{children}</span>
    </span>
  );
}
