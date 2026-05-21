import { useState } from "react";
import { toast } from "sonner";
import {
  PageSection,
  PageSectionContent,
  PageSectionDescription,
  PageSectionFooter,
} from "~/components/PageSection";
import { TotpCodeForm } from "~/components/auth/totp-code-form";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { authClient } from "~/lib/auth-client";

type SessionUser = {
  twoFactorEnabled?: boolean;
};

type SetupState = {
  totpURI: string;
  backupCodes: string[];
};

export function AccountTwoFactorSection() {
  const { data: session } = authClient.useSession();
  const user = session?.user as SessionUser | undefined;
  const twoFactorEnabled = user?.twoFactorEnabled ?? false;

  const [password, setPassword] = useState("");
  const [setup, setSetup] = useState<SetupState | null>(null);
  const [savedBackupCodes, setSavedBackupCodes] = useState<string[] | null>(
    null
  );
  const [isEnabling, setIsEnabling] = useState(false);
  const [isVerifyingSetup, setIsVerifyingSetup] = useState(false);
  const [isDisabling, setIsDisabling] = useState(false);
  const [disablePassword, setDisablePassword] = useState("");

  const handleStartEnable = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    setIsEnabling(true);
    try {
      const { data, error } = await authClient.twoFactor.enable({
        ...(password ? { password } : {}),
        issuer: "Project Y",
      });

      if (error) {
        toast.error(error.message ?? "Could not enable two-factor authentication");
        return;
      }

      if (!data?.totpURI) {
        toast.error("Could not start two-factor setup");
        return;
      }

      setSetup({
        totpURI: data.totpURI,
        backupCodes: data.backupCodes ?? [],
      });
      setPassword("");
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Could not enable two-factor authentication"
      );
    } finally {
      setIsEnabling(false);
    }
  };

  const handleVerifySetup = async (code: string) => {
    if (isVerifyingSetup) return;

    setIsVerifyingSetup(true);
    try {
      const { error } = await authClient.twoFactor.verifyTotp({ code });
      if (error) {
        toast.error(error.message ?? "Invalid code");
        return;
      }

      setSavedBackupCodes(setup?.backupCodes ?? []);
      setSetup(null);
      toast.success("Two-factor authentication enabled");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Invalid code");
    } finally {
      setIsVerifyingSetup(false);
    }
  };

  const handleDisable = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsDisabling(true);
    try {
      const { error } = await authClient.twoFactor.disable({
        ...(disablePassword ? { password: disablePassword } : {}),
      });

      if (error) {
        toast.error(error.message ?? "Could not disable two-factor authentication");
        return;
      }

      setDisablePassword("");
      toast.success("Two-factor authentication disabled");
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Could not disable two-factor authentication"
      );
    } finally {
      setIsDisabling(false);
    }
  };

  if (setup) {
    return (
      <PageSection title="Two-factor authentication">
        <PageSectionContent className="max-w-md space-y-4">
          <PageSectionDescription>
            Scan this setup key in your authenticator app (Google Authenticator,
            Authy, 1Password, etc.), then enter the 6-digit code to finish.
          </PageSectionDescription>
          <div className="rounded-md border border-border/60 bg-muted/40 p-3">
            <p className="break-all font-mono text-xs">{setup.totpURI}</p>
          </div>
          <TotpCodeForm
            isLoading={isVerifyingSetup}
            onSubmit={handleVerifySetup}
            submitLabel="Confirm authenticator"
          />
        </PageSectionContent>
        <PageSectionFooter align="start">
          <Button
            type="button"
            variant="ghost"
            onClick={() => setSetup(null)}
          >
            Cancel setup
          </Button>
        </PageSectionFooter>
      </PageSection>
    );
  }

  if (savedBackupCodes && savedBackupCodes.length > 0) {
    return (
      <PageSection title="Two-factor authentication">
        <PageSectionContent className="max-w-md space-y-4">
          <p className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
            Save these backup codes in a secure place. Each code can be used once
            if you lose access to your authenticator.
          </p>
          <ul className="divide-y rounded-md border border-border/60 font-mono text-sm">
            {savedBackupCodes.map((code) => (
              <li key={code} className="px-3 py-2">
                {code}
              </li>
            ))}
          </ul>
        </PageSectionContent>
        <PageSectionFooter>
          <Button type="button" onClick={() => setSavedBackupCodes(null)}>
            I saved my backup codes
          </Button>
        </PageSectionFooter>
      </PageSection>
    );
  }

  return (
    <PageSection title="Two-factor authentication">
      <PageSectionContent className="max-w-md space-y-4">
        <PageSectionDescription>
          Add an extra layer of security with an authenticator app. Optional but
          recommended for your account.
        </PageSectionDescription>

        {twoFactorEnabled ? (
          <form id="disable-2fa-form" onSubmit={handleDisable} className="space-y-4">
            <p className="text-sm font-medium text-green-700">
              Two-factor authentication is enabled.
            </p>
            <div className="flex flex-col gap-2">
              <Label htmlFor="disable-2fa-password">
                Password (if you use email sign-in)
              </Label>
              <Input
                id="disable-2fa-password"
                type="password"
                autoComplete="current-password"
                value={disablePassword}
                onChange={(e) => setDisablePassword(e.target.value)}
                placeholder="Leave empty if you only use Google"
              />
            </div>
          </form>
        ) : (
          <form id="enable-2fa-form" onSubmit={handleStartEnable} className="space-y-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="enable-2fa-password">
                Password (if you use email sign-in)
              </Label>
              <Input
                id="enable-2fa-password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Leave empty if you only use Google"
              />
            </div>
          </form>
        )}
      </PageSectionContent>
      <PageSectionFooter align={twoFactorEnabled ? "start" : "end"}>
        {twoFactorEnabled ? (
          <Button
            type="submit"
            form="disable-2fa-form"
            variant="destructive"
            loading={isDisabling}
          >
            Disable two-factor authentication
          </Button>
        ) : (
          <Button type="submit" form="enable-2fa-form" loading={isEnabling}>
            Set up authenticator app
          </Button>
        )}
      </PageSectionFooter>
    </PageSection>
  );
}
