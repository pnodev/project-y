import type { ReactNode } from "react";
import { AuthBrandPanel } from "~/components/auth/auth-brand-panel";

type AuthLayoutProps = {
  children: ReactNode;
  title: string;
  description?: string;
};

export function AuthLayout({ children, title, description }: AuthLayoutProps) {
  return (
    <div className="auth-shell min-h-screen lg:grid lg:grid-cols-2">
      <AuthBrandPanel className="hidden lg:flex lg:min-h-screen lg:items-center lg:justify-center" />

      <div className="flex min-h-screen flex-col bg-background">
        <AuthBrandPanel compact className="lg:hidden" />
        <div className="flex flex-1 items-center justify-center px-6 py-10 lg:px-10">
          <div className="flex w-full max-w-md flex-col gap-8">
            <div className="space-y-2">
              <h2 className="text-2xl font-semibold tracking-tight">{title}</h2>
              {description ? (
                <p className="text-sm text-muted-foreground">{description}</p>
              ) : null}
            </div>
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
