import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { z } from "zod";
import { authClient } from "~/lib/auth-client";
import { AuthLayout } from "~/components/auth/auth-layout";
import { AuthDivider } from "~/components/auth/auth-divider";
import { GoogleSignInButton } from "~/components/auth/google-sign-in-button";
import { SignInForm } from "~/components/auth/sign-in-form";
import { SignUpForm } from "~/components/auth/sign-up-form";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import { toast } from "sonner";
import { formatUserName } from "~/lib/utils";

const signInSearchSchema = z.object({
  tab: z.enum(["sign-in", "sign-up"]).optional().catch(undefined),
});

export const Route = createFileRoute("/sign-in/$")({
  validateSearch: signInSearchSchema,
  component: RouteComponent,
});

function RouteComponent() {
  const navigate = useNavigate();
  const { tab } = Route.useSearch();
  const [isLoading, setIsLoading] = useState(false);

  const defaultTab = tab === "sign-up" ? "sign-up" : "sign-in";

  const handleSignIn = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    const formData = new FormData(e.currentTarget);

    try {
      const { error } = await authClient.signIn.email({
        email: formData.get("email") as string,
        password: formData.get("password") as string,
      });

      if (error) {
        toast.error(error.message ?? "Sign in failed");
        return;
      }

      navigate({ to: "/dashboard" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    const formData = new FormData(e.currentTarget);

    const firstname = formData.get("firstname") as string;
    const lastname = formData.get("lastname") as string;

    try {
      const { error } = await authClient.signUp.email({
        email: formData.get("email") as string,
        password: formData.get("password") as string,
        name: formatUserName(firstname, lastname),
        firstname,
        lastname,
      });

      if (error) {
        toast.error(error.message ?? "Sign up failed");
        return;
      }

      navigate({ to: "/dashboard" });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthLayout
      title="Welcome back"
      description="Sign in or create an account to continue"
    >
      <div className="flex flex-col gap-6">
        <Tabs defaultValue={defaultTab}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="sign-in">Sign in</TabsTrigger>
            <TabsTrigger value="sign-up">Sign up</TabsTrigger>
          </TabsList>
          <TabsContent value="sign-in" className="pt-4">
            <SignInForm isLoading={isLoading} onSubmit={handleSignIn} />
          </TabsContent>
          <TabsContent value="sign-up" className="pt-4">
            <SignUpForm isLoading={isLoading} onSubmit={handleSignUp} />
          </TabsContent>
        </Tabs>

        <AuthDivider />
        <GoogleSignInButton disabled={isLoading} />
      </div>
    </AuthLayout>
  );
}
