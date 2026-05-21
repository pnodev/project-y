import { useState } from "react";
import { toast } from "sonner";
import { Button } from "~/components/ui/button";
import { authClient } from "~/lib/auth-client";

type VerifyEmailPendingProps = {
  email: string;
};

export function VerifyEmailPending({ email }: VerifyEmailPendingProps) {
  const [isResending, setIsResending] = useState(false);

  const handleResend = async () => {
    setIsResending(true);
    try {
      const { error } = await authClient.sendVerificationEmail({
        email,
        callbackURL: "/dashboard",
      });

      if (error) {
        toast.error(error.message ?? "Could not resend verification email");
        return;
      }

      toast.success("Verification email sent");
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Could not resend verification email"
      );
    } finally {
      setIsResending(false);
    }
  };

  return (
    <div className="flex flex-col gap-4 rounded-lg border border-border bg-muted/30 p-4">
      <p className="text-sm">
        We sent a confirmation link to <strong>{email}</strong>. Please open it
        to activate your account (double opt-in). You can sign in after your
        email is confirmed.
      </p>
      <Button
        type="button"
        variant="outline"
        loading={isResending}
        onClick={() => void handleResend()}
      >
        Resend confirmation email
      </Button>
    </div>
  );
}
