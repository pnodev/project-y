import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { AuthLayout } from "~/components/auth/auth-layout";
import { ResetPasswordForm } from "~/components/auth/reset-password-form";
import { pageMeta } from "~/utils/seo";

const resetPasswordSearchSchema = z.object({
  token: z.string().optional().catch(undefined),
  error: z.string().optional().catch(undefined),
});

export const Route = createFileRoute("/reset-password")({
  validateSearch: resetPasswordSearchSchema,
  head: () => ({
    meta: [...pageMeta("Choose a new password")],
  }),
  component: RouteComponent,
});

function RouteComponent() {
  const { token, error } = Route.useSearch();
  const hasError = error === "INVALID_TOKEN" || error === "invalid_token";

  return (
    <AuthLayout
      title="Choose a new password"
      description="Enter a new password for your account."
    >
      <ResetPasswordForm token={token ?? null} hasError={hasError} />
    </AuthLayout>
  );
}
