import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { AvatarUploadField } from "~/components/AvatarUploadField";
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
import { authClient } from "~/lib/auth-client";
import { normalizeOrgSlug } from "~/hooks/use-organizations";
import {
  formSheetFooterClass,
  formSheetFormClass,
  formSheetScrollClass,
} from "~/components/ui/surface-styles";
import { cn } from "~/lib/utils";

const schema = z.object({
  name: z.string().min(1, "Name is required"),
  slug: z.string().min(1, "Slug is required"),
});

type FormValues = z.infer<typeof schema>;

type FormLayout = "page" | "sheet";

type CreateOrganizationFormProps = {
  layout?: FormLayout;
  formId?: string;
  sheetFooter?: React.ReactNode;
  onSuccess?: () => void;
};

export function CreateOrganizationForm({
  layout = "page",
  formId = "organization-create-form",
  sheetFooter,
  onSuccess,
}: CreateOrganizationFormProps) {
  const navigate = useNavigate();
  const [logo, setLogo] = useState<string | null>(null);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { name: "", slug: "" },
  });

  const onSubmit = async (values: FormValues) => {
    const slug = normalizeOrgSlug(values.slug);
    const { data, error } = await authClient.organization.create({
      name: values.name,
      slug,
      logo: logo ?? undefined,
    });

    if (error || !data) {
      toast.error(error?.message ?? "Failed to create organization");
      return;
    }

    const { error: setActiveError } = await authClient.organization.setActive({
      organizationId: data.id,
    });

    if (setActiveError) {
      toast.error(
        setActiveError.message ?? "Organization created but failed to activate it"
      );
      return;
    }

    toast.success("Organization created");
    if (onSuccess) {
      onSuccess();
    } else {
      navigate({ to: "/settings/organization" });
    }
  };

  const submitButton = (
    <Button type="submit" loading={form.formState.isSubmitting}>
      Create organization
    </Button>
  );

  return (
    <Form {...form}>
      <form
        id={formId}
        onSubmit={form.handleSubmit(onSubmit)}
        className={cn(
          layout === "page" ? "space-y-8" : formSheetFormClass
        )}
      >
        <div
          className={cn(
            layout === "sheet" && formSheetScrollClass
          )}
        >
          <FormLayoutShell
          layout={layout}
          title="New organization"
          footer={submitButton}
          contentClassName={layout === "sheet" ? "space-y-4" : "space-y-6"}
        >
          {layout === "sheet" ? (
            <>
              <FormSheetSection title="Branding">
                <AvatarUploadField
                  imageUrl={logo}
                  fallback="O"
                  label="Organization logo (optional)"
                  onUploaded={async (url) => setLogo(url)}
                />
              </FormSheetSection>
              <FormSheetSection title="General">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Name</FormLabel>
                      <FormControl>
                        <Input placeholder="My organization" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="slug"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Slug</FormLabel>
                      <FormControl>
                        <Input placeholder="my-org" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </FormSheetSection>
            </>
          ) : (
            <>
              <AvatarUploadField
                imageUrl={logo}
                fallback="O"
                label="Organization logo (optional)"
                onUploaded={async (url) => setLogo(url)}
              />
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name</FormLabel>
                    <FormControl>
                      <Input placeholder="My organization" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="slug"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Slug</FormLabel>
                    <FormControl>
                      <Input placeholder="my-org" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </>
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
