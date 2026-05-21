import { useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { authClient } from "~/lib/auth-client";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { toast } from "sonner";

type ResetPasswordFormProps = {
  token: string | null;
  hasError: boolean;
};

export function ResetPasswordForm({ token, hasError }: ResetPasswordFormProps) {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);

  if (hasError || !token) {
    return (
      <div className="flex flex-col gap-4">
        <p className="rounded-md border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          This reset link is invalid or has expired. Request a new one to continue.
        </p>
        <Link to="/forgot-password" className="auth-link w-fit">
          Request a new reset link
        </Link>
        <Link to="/sign-in/$" className="auth-link w-fit">
          Back to sign in
        </Link>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const newPassword = formData.get("newPassword") as string;
    const confirmPassword = formData.get("confirmPassword") as string;

    if (newPassword !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }

    setIsLoading(true);

    try {
      const { error } = await authClient.resetPassword({
        newPassword,
        token,
      });

      if (error) {
        toast.error(error.message ?? "Failed to reset password");
        return;
      }

      toast.success("Password updated. You can sign in now.");
      navigate({ to: "/sign-in/$" });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <Label htmlFor="new-password">New password</Label>
        <Input
          id="new-password"
          name="newPassword"
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
        />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="confirm-password">Confirm password</Label>
        <Input
          id="confirm-password"
          name="confirmPassword"
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
        />
      </div>
      <Button type="submit" loading={isLoading} className="w-full">
        Reset password
      </Button>
      <Link to="/sign-in/$" className="auth-link w-fit">
        Back to sign in
      </Link>
    </form>
  );
}
