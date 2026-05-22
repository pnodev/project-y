import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { ColorSelect } from "~/components/ColorSelect";
import { FormLayoutShell } from "~/components/FormLayoutShell";
import { FormSheetSection } from "~/components/FormSheetSection";
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
import { Color, COLOR_VALUES } from "~/db/schema";
import {
  formSheetFooterClass,
  formSheetFormClass,
  formSheetScrollClass,
} from "~/components/ui/surface-styles";
import { cn } from "~/lib/utils";

const schema = z.object({
  name: z.string().min(1, "Name is required"),
  color: z.enum(COLOR_VALUES as [Color, ...Color[]]),
});

type FormValues = z.infer<typeof schema>;

type EntityKind = "label" | "status";

const entityMeta: Record<
  EntityKind,
  {
    sheetTitle: string;
    description: string;
    sectionTitle: string;
    nameLabel: string;
    namePlaceholder: string;
    submitLabel: string;
    successMessage: string;
    errorMessage: string;
  }
> = {
  label: {
    sheetTitle: "Add label",
    description: "Create a label to categorize tasks.",
    sectionTitle: "General",
    nameLabel: "Name",
    namePlaceholder: "e.g. Bug",
    submitLabel: "Create label",
    successMessage: "Label created",
    errorMessage: "Failed to create label",
  },
  status: {
    sheetTitle: "Add status",
    description: "Create a workflow status for your task board.",
    sectionTitle: "General",
    nameLabel: "Name",
    namePlaceholder: "e.g. In progress",
    submitLabel: "Create status",
    successMessage: "Status created",
    errorMessage: "Failed to create status",
  },
};

type FormLayout = "page" | "sheet";

type EntityConfigCreateFormProps = {
  kind: EntityKind;
  layout?: FormLayout;
  formId?: string;
  sheetFooter?: React.ReactNode;
  onSubmit: (data: { name: string; color: Color }) => void | Promise<void>;
};

export function EntityConfigCreateForm({
  kind,
  layout = "sheet",
  formId,
  sheetFooter,
  onSubmit,
}: EntityConfigCreateFormProps) {
  const meta = entityMeta[kind];
  const resolvedFormId = formId ?? `${kind}-create-form`;

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { name: "", color: "neutral" },
  });

  const handleSubmit = async (values: FormValues) => {
    try {
      await onSubmit(values);
      form.reset({ name: "", color: "neutral" });
      toast.success(meta.successMessage);
    } catch {
      toast.error(meta.errorMessage);
    }
  };

  const submitButton = (
    <Button type="submit" loading={form.formState.isSubmitting}>
      {meta.submitLabel}
    </Button>
  );

  const fields = (
    <>
      <FormField
        control={form.control}
        name="name"
        render={({ field }) => (
          <FormItem>
            <FormLabel>{meta.nameLabel}</FormLabel>
            <FormControl>
              <Input placeholder={meta.namePlaceholder} {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={form.control}
        name="color"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Color</FormLabel>
            <FormControl>
              <ColorSelect
                variant="field"
                value={field.value}
                onValueChange={field.onChange}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    </>
  );

  return (
    <Form {...form}>
      <form
        id={resolvedFormId}
        onSubmit={form.handleSubmit(handleSubmit)}
        className={cn(
          layout === "page" ? "space-y-8" : formSheetFormClass
        )}
      >
        <div className={cn(layout === "sheet" && formSheetScrollClass)}>
          <FormLayoutShell
            layout={layout}
            title={meta.sheetTitle}
            footer={submitButton}
            contentClassName={layout === "sheet" ? "space-y-4" : "space-y-6"}
          >
            {layout === "sheet" ? (
              <FormSheetSection title={meta.sectionTitle}>
                {fields}
              </FormSheetSection>
            ) : (
              fields
            )}
          </FormLayoutShell>
        </div>
        {layout === "sheet" && sheetFooter ? (
          <div className={cn(formSheetFooterClass, "shrink-0")}>{sheetFooter}</div>
        ) : null}
      </form>
    </Form>
  );
}
