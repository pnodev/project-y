import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { AuthLayout } from "~/components/auth/auth-layout";
import { TotpCodeForm } from "~/components/auth/totp-code-form";
import { authClient } from "~/lib/auth-client";
import { pageMeta } from "~/utils/seo";

export const Route = createFileRoute("/two-factor")({
  head: () => ({
    meta: [...pageMeta("Two-factor authentication")],
  }),
  component: RouteComponent,
});

function RouteComponent() {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [trustDevice, setTrustDevice] = useState(false);

  const handleVerify = async (code: string) => {
    setIsLoading(true);
    try {
      const { error } = await authClient.twoFactor.verifyTotp({
        code,
        trustDevice,
      });

      if (error) {
        toast.error(error.message ?? "Invalid code");
        return;
      }

      toast.success("Signed in");
      navigate({ to: "/dashboard" });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Invalid code");
    } finally {
      setIsLoading(false);
    }
  };

  const handleBackupCode = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    const formData = new FormData(e.currentTarget);
    const code = (formData.get("backupCode") as string).trim();

    try {
      const { error } = await authClient.twoFactor.verifyBackupCode({
        code,
        trustDevice,
      });

      if (error) {
        toast.error(error.message ?? "Invalid backup code");
        return;
      }

      toast.success("Signed in");
      navigate({ to: "/dashboard" });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Invalid backup code");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthLayout
      title="Two-factor authentication"
      description="Enter the code from your authenticator app to finish signing in"
    >
      <TotpCodeForm
        isLoading={isLoading}
        trustDevice={trustDevice}
        onTrustDeviceChange={setTrustDevice}
        onSubmit={handleVerify}
        submitLabel="Continue"
      />

      <details className="text-sm">
        <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
          Use a backup code instead
        </summary>
        <form
          onSubmit={handleBackupCode}
          className="mt-4 flex flex-col gap-3"
        >
          <input
            name="backupCode"
            required
            placeholder="Backup code"
            className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs"
          />
          <button
            type="submit"
            disabled={isLoading}
            className="text-sm font-medium text-primary hover:underline disabled:opacity-50"
          >
            Verify backup code
          </button>
        </form>
      </details>
    </AuthLayout>
  );
}
