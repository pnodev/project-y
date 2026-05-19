import { useNavigate } from "@tanstack/react-router";
import { useState } from "react";
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
import { normalizeOrgSlug } from "~/hooks/use-organizations";

const schema = z.object({
  name: z.string().min(1, "Name is required"),
  slug: z.string().min(1, "Slug is required"),
});

type FormValues = z.infer<typeof schema>;

export function CreateOrganizationForm() {
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
    navigate({ to: "/settings/organization" });
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        <PageSection title="New organization">
          <PageSectionContent className="space-y-6">
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
                <FormItem className="max-w-md">
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
                <FormItem className="max-w-md">
                  <FormLabel>Slug</FormLabel>
                  <FormControl>
                    <Input placeholder="my-org" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </PageSectionContent>
          <PageSectionFooter>
            <Button type="submit" loading={form.formState.isSubmitting}>
              Create organization
            </Button>
          </PageSectionFooter>
        </PageSection>
      </form>
    </Form>
  );
}
