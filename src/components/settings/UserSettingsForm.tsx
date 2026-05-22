import { AccountProfileSection } from "./AccountProfileSection";
import { AccountSecuritySection } from "./AccountSecuritySection";
import { AccountTwoFactorSection } from "./AccountTwoFactorSection";

type UserSettingsFormProps = {
  user: {
    image?: string | null;
    email: string;
    firstname?: string;
    lastname?: string;
    name?: string;
  };
};

export function UserSettingsForm({ user }: UserSettingsFormProps) {
  return (
    <div className="grid gap-6">
      <AccountProfileSection user={user} />
      <AccountSecuritySection />
      <AccountTwoFactorSection />
    </div>
  );
}
