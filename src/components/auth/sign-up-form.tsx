import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";

type SignUpFormProps = {
  isLoading: boolean;
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
};

export function SignUpForm({ isLoading, onSubmit }: SignUpFormProps) {
  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-2">
          <Label htmlFor="sign-up-firstname">First name</Label>
          <Input
            id="sign-up-firstname"
            name="firstname"
            required
            autoComplete="given-name"
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="sign-up-lastname">Last name</Label>
          <Input
            id="sign-up-lastname"
            name="lastname"
            required
            autoComplete="family-name"
          />
        </div>
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="sign-up-email">Email</Label>
        <Input
          id="sign-up-email"
          name="email"
          type="email"
          required
          autoComplete="email"
        />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="sign-up-password">Password</Label>
        <Input
          id="sign-up-password"
          name="password"
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
        />
      </div>
      <Button type="submit" loading={isLoading} className="w-full">
        Create account
      </Button>
    </form>
  );
}
