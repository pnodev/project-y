import { Link } from "@tanstack/react-router";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";

type SignInFormProps = {
  isLoading: boolean;
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
};

export function SignInForm({ isLoading, onSubmit }: SignInFormProps) {
  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <Label htmlFor="sign-in-email">Email</Label>
        <Input
          id="sign-in-email"
          name="email"
          type="email"
          required
          autoComplete="email"
        />
      </div>
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="sign-in-password">Password</Label>
          <Link to="/forgot-password" className="auth-link">
            Forgot password?
          </Link>
        </div>
        <Input
          id="sign-in-password"
          name="password"
          type="password"
          required
          autoComplete="current-password"
        />
      </div>
      <Button type="submit" loading={isLoading} className="w-full">
        Sign in
      </Button>
    </form>
  );
}
