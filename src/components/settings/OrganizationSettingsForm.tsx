import { useEffect } from "react";
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
import { normalizeOrgSlug, type Organization } from "~/hooks/use-organizations";
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

type OrganizationSettingsFormProps = {
  organization: Organization;
  onUpdated: () => void;
  layout?: FormLayout;
  formId?: string;
  sheetFooter?: React.ReactNode;
};

export function OrganizationSettingsForm({
  organization,
  onUpdated,
  layout = "page",
  formId = "organization-edit-form",
  sheetFooter,
}: OrganizationSettingsFormProps) {
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: organization.name,
      slug: organization.slug,
    },
  });

  useEffect(() => {
    form.reset({
      name: organization.name,
      slug: organization.slug,
    });
  }, [organization.id, organization.name, organization.slug]);

  const handleLogoUpload = async (logo: string) => {
    const { error } = await authClient.organization.update({
      organizationId: organization.id,
      data: { logo },
    });
    if (error) {
      toast.error(error.message ?? "Failed to update logo");
      return;
    }
    onUpdated();
    toast.success("Logo updated");
  };

  const onSubmit = async (values: FormValues) => {
    const { error } = await authClient.organization.update({
      organizationId: organization.id,
      data: {
        name: values.name,
        slug: normalizeOrgSlug(values.slug),
      },
    });
    if (error) {
      toast.error(error.message ?? "Failed to update organization");
      return;
    }
    onUpdated();
    toast.success("Organization updated");
  };

  const submitButton = (
    <Button type="submit" loading={form.formState.isSubmitting}>
      Save changes
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
          title="Organization"
          footer={submitButton}
          contentClassName={layout === "sheet" ? "space-y-4" : "space-y-6"}
        >
          {layout === "sheet" ? (
            <>
              <FormSheetSection title="Branding">
                <AvatarUploadField
                  imageUrl={organization.logo}
                  fallback={organization.name.slice(0, 1).toUpperCase()}
                  label="Organization logo"
                  onUploaded={handleLogoUpload}
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
                        <Input {...field} />
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
                        <Input {...field} />
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
                imageUrl={organization.logo}
                fallback={organization.name.slice(0, 1).toUpperCase()}
                label="Organization logo"
                onUploaded={handleLogoUpload}
              />
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name</FormLabel>
                    <FormControl>
                      <Input {...field} />
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
                      <Input {...field} />
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
