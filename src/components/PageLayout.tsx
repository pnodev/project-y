import { cn } from "~/lib/utils";

export function PageLayout({
  children,
  title,
  actions,
}: {
  children: React.ReactNode;
  title: string;
  actions?: React.ReactNode;
}) {
  return (
    <>
      <div className="px-6 py-4 md:flex md:items-center md:justify-between">
        <div className="min-w-0 flex-1">
          <h2 className="text-2xl/7 font-bold text-gray-900 sm:truncate sm:text-3xl sm:tracking-tight">
            {title}
          </h2>
        </div>
        <div className="mt-4 flex md:mt-0 md:ml-4">
          {actions ? actions : null}
        </div>
      </div>

      <div
        className={cn(
          "px-6 flex-1 flex flex-col gap-4 w-[calc(100vw-var(--sidebar-width))] overflow-auto",
          "scrollbar-thin scrollbar-thumb-gray-500 scrollbar-track-transparent scrollbar-thumb-rounded-full"
        )}
      >
        {children}
      </div>
    </>
  );
}
