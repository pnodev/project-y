import { Button } from "~/components/ui/button";

type FormSheetFooterActionsProps = {
  onCancel: () => void;
  submitLabel: string;
  formId: string;
  loading?: boolean;
};

export function FormSheetFooterActions({
  onCancel,
  submitLabel,
  formId,
  loading,
}: FormSheetFooterActionsProps) {
  return (
    <div className="flex w-full min-w-0 gap-2">
      <Button
        type="button"
        variant="secondary"
        className="shrink-0"
        onClick={onCancel}
      >
        Cancel
      </Button>
      <Button
        type="submit"
        form={formId}
        loading={loading}
        className="min-w-0 flex-1"
      >
        {submitLabel}
      </Button>
    </div>
  );
}
