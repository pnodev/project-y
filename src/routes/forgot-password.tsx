import { createFileRoute } from "@tanstack/react-router";
import { AuthLayout } from "~/components/auth/auth-layout";
import { ForgotPasswordForm } from "~/components/auth/forgot-password-form";
import { pageMeta } from "~/utils/seo";

export const Route = createFileRoute("/forgot-password")({
  head: () => ({
    meta: [...pageMeta("Reset your password")],
  }),
  component: RouteComponent,
});

function RouteComponent() {
  return (
    <AuthLayout
      title="Reset your password"
      description="Enter your email and we'll send you a link to choose a new password."
    >
      <ForgotPasswordForm />
    </AuthLayout>
  );
}
