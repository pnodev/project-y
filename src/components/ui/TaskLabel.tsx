export function TaskLabel({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span className={`text-sm font-medium text-gray-700 ${className}`}>
      {children}
    </span>
  );
}
