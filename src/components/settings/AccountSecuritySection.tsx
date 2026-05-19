import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import {
  PageSection,
  PageSectionContent,
} from "~/components/PageSection";
import { Button } from "~/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "~/components/ui/form";
import { Input } from "~/components/ui/input";
import { authClient } from "~/lib/auth-client";

const passwordSchema = z
  .object({
    currentPassword: z.string().min(1, "Current password is required"),
    newPassword: z.string().min(8, "Password must be at least 8 characters"),
    confirmPassword: z.string().min(1, "Please confirm your password"),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

type PasswordFormValues = z.infer<typeof passwordSchema>;

type LinkedAccount = {
  id: string;
  providerId: string;
  accountId: string;
};

export function AccountSecuritySection() {
  const [accounts, setAccounts] = useState<LinkedAccount[]>([]);
  const [isLoadingAccounts, setIsLoadingAccounts] = useState(true);

  const form = useForm<PasswordFormValues>({
    resolver: zodResolver(passwordSchema),
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    },
  });

  useEffect(() => {
    void authClient.listAccounts().then(({ data, error }) => {
      setIsLoadingAccounts(false);
      if (error) {
        console.error(error);
        return;
      }
      setAccounts((data ?? []) as LinkedAccount[]);
    });
  }, []);

  const hasCredential = accounts.some((a) => a.providerId === "credential");
  const hasGoogle = accounts.some((a) => a.providerId === "google");
  const canUnlink = accounts.length > 1;

  const onPasswordSubmit = async (values: PasswordFormValues) => {
    const { error } = await authClient.changePassword({
      currentPassword: values.currentPassword,
      newPassword: values.newPassword,
      revokeOtherSessions: true,
    });
    if (error) {
      toast.error(error.message ?? "Failed to change password");
      return;
    }
    form.reset();
    toast.success("Password updated");
  };

  const handleLinkGoogle = async () => {
    await authClient.linkSocial({
      provider: "google",
      callbackURL: "/settings/account",
    });
  };

  const handleUnlink = async (providerId: string) => {
    const { error } = await authClient.unlinkAccount({ providerId });
    if (error) {
      toast.error(error.message ?? "Failed to unlink account");
      return;
    }
    const { data } = await authClient.listAccounts();
    setAccounts((data ?? []) as LinkedAccount[]);
    toast.success("Account unlinked");
  };

  return (
    <>
      {hasCredential ? (
        <PageSection title="Password">
          <PageSectionContent>
            <Form {...form}>
              <form
                onSubmit={form.handleSubmit(onPasswordSubmit)}
                className="space-y-4 max-w-md"
              >
                <FormField
                  control={form.control}
                  name="currentPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Current password</FormLabel>
                      <FormControl>
                        <Input type="password" autoComplete="current-password" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="newPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>New password</FormLabel>
                      <FormControl>
                        <Input type="password" autoComplete="new-password" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="confirmPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Confirm new password</FormLabel>
                      <FormControl>
                        <Input type="password" autoComplete="new-password" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button type="submit" loading={form.formState.isSubmitting}>
                  Change password
                </Button>
              </form>
            </Form>
          </PageSectionContent>
        </PageSection>
      ) : (
        <PageSection title="Password">
          <PageSectionContent>
            <p className="text-sm text-gray-500">
              You sign in with a connected account only. Link email/password sign-in
              is not available from this screen.
            </p>
          </PageSectionContent>
        </PageSection>
      )}

      <PageSection title="Connected accounts">
        <PageSectionContent className="space-y-4">
          {isLoadingAccounts ? (
            <p className="text-sm text-gray-500">Loading accounts…</p>
          ) : (
            <ul className="space-y-3">
              {accounts.map((account) => (
                <li
                  key={account.id}
                  className="flex items-center justify-between gap-4 rounded-md border px-4 py-3"
                >
                  <div>
                    <p className="text-sm font-medium capitalize">
                      {account.providerId}
                    </p>
                    {account.providerId !== "credential" ? (
                      <p className="text-xs text-gray-500">{account.accountId}</p>
                    ) : (
                      <p className="text-xs text-gray-500">Email and password</p>
                    )}
                  </div>
                  {account.providerId !== "credential" && canUnlink ? (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => void handleUnlink(account.providerId)}
                    >
                      Unlink
                    </Button>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
          {!hasGoogle ? (
            <Button type="button" variant="outline" onClick={() => void handleLinkGoogle()}>
              Link Google account
            </Button>
          ) : null}
        </PageSectionContent>
      </PageSection>
    </>
  );
}
