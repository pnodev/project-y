import { useTheme } from "next-themes";
import { Toaster as Sonner, ToasterProps } from "sonner";

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme();

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      style={
        {
          "--normal-bg": "var(--color-indigo-700)",
          "--normal-text": "var(--color-white)",
          "--normal-border": "var(--color-indigo-600)",
          "--error-bg": "var(--color-red-700)",
          "--error-text": "var(--color-white)",
          "--error-border": "var(--color-red-600)",
        } as React.CSSProperties
      }
      toastOptions={{
        classNames: {
          error:
            "[&[data-type='error']]:!bg-[var(--error-bg)] [&[data-type='error']]:!text-[var(--error-text)] [&[data-type='error']]:!border-[var(--error-border)]",
        },
      }}
      {...props}
    />
  );
};

export { Toaster };
