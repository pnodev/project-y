import { cn } from "~/lib/utils";

export function PageSection({
  title,
  children,
  className,
}: React.ComponentProps<"section"> & {
  title?: string;
  children: React.ReactNode;
}) {
  return (
    <section className={cn("border rounded-md shadow-sm", className)}>
      {title ? <h2 className="text-xl font-bold px-6 pt-5">{title}</h2> : null}
      {children}
    </section>
  );
}

export function PageSectionContent({
  children,
  className,
}: React.ComponentProps<"div"> & {
  children: React.ReactNode;
}) {
  return (
    <div className={cn("p-6 [&_p]:text-sm [&_p]:text-gray-500", className)}>
      {children}
    </div>
  );
}

export function PageSectionFooter({
  children,
  className,
}: React.ComponentProps<"footer"> & {
  children: React.ReactNode;
}) {
  return (
    <footer
      className={cn(
        "bg-gray-100 border-t px-6 py-3 flex justify-end",
        className
      )}
    >
      {children}
    </footer>
  );
}
