import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";

type TotpCodeFormProps = {
  isLoading: boolean;
  onSubmit: (code: string) => void | Promise<void>;
  submitLabel?: string;
  trustDevice?: boolean;
  onTrustDeviceChange?: (trusted: boolean) => void;
};

export function TotpCodeForm({
  isLoading,
  onSubmit,
  submitLabel = "Verify",
  trustDevice,
  onTrustDeviceChange,
}: TotpCodeFormProps) {
  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const code = (formData.get("code") as string).replace(/\s/g, "");
    void onSubmit(code);
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <Label htmlFor="totp-code">Authentication code</Label>
        <Input
          id="totp-code"
          name="code"
          inputMode="numeric"
          autoComplete="one-time-code"
          pattern="[0-9]{6}"
          maxLength={6}
          minLength={6}
          required
          disabled={isLoading}
          placeholder="000000"
          className="font-mono tracking-widest"
        />
        <p className="text-xs text-muted-foreground">
          Enter the 6-digit code from your authenticator app.
        </p>
      </div>
      {onTrustDeviceChange ? (
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={trustDevice ?? false}
            onChange={(e) => onTrustDeviceChange(e.target.checked)}
            className="size-4 rounded border"
          />
          Trust this device for 30 days
        </label>
      ) : null}
      <Button type="submit" loading={isLoading} className="w-full">
        {submitLabel}
      </Button>
    </form>
  );
}
