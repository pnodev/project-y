export function TaskLabel({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span className={`"text-sm font-medium text-gray-800" ${className}`}>
      {children}
    </span>
  );
}
