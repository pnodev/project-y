import { useFormContext, useFormState } from "react-hook-form";
import { FormSheetFooterActions } from "~/components/FormSheetFooterActions";

type FormSheetFormFooterProps = {
  onCancel: () => void;
  submitLabel: string;
  formId: string;
};

/** Sheet footer actions; must render inside a react-hook-form `<Form>`. */
export function FormSheetFormFooter({
  onCancel,
  submitLabel,
  formId,
}: FormSheetFormFooterProps) {
  const { control } = useFormContext();
  const { isSubmitting } = useFormState({ control });

  return (
    <FormSheetFooterActions
      onCancel={onCancel}
      submitLabel={submitLabel}
      formId={formId}
      loading={isSubmitting}
    />
  );
}
