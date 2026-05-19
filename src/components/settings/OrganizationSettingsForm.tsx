import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { AvatarUploadField } from "~/components/AvatarUploadField";
import {
  PageSection,
  PageSectionContent,
  PageSectionFooter,
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
import { normalizeOrgSlug, type Organization } from "~/hooks/use-organizations";

const schema = z.object({
  name: z.string().min(1, "Name is required"),
  slug: z.string().min(1, "Slug is required"),
});

type FormValues = z.infer<typeof schema>;

type OrganizationSettingsFormProps = {
  organization: Organization;
  onUpdated: () => void;
};

export function OrganizationSettingsForm({
  organization,
  onUpdated,
}: OrganizationSettingsFormProps) {
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: organization.name,
      slug: organization.slug,
    },
  });

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

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        <PageSection title="Organization">
          <PageSectionContent className="space-y-6">
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
                <FormItem className="max-w-md">
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
                <FormItem className="max-w-md">
                  <FormLabel>Slug</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </PageSectionContent>
          <PageSectionFooter>
            <Button type="submit" loading={form.formState.isSubmitting}>
              Save changes
            </Button>
          </PageSectionFooter>
        </PageSection>
      </form>
    </Form>
  );
}
