import { useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { AvatarUploadField } from "~/components/AvatarUploadField";
import {
  PageSection,
  PageSectionContent,
  PageSectionDescription,
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
import { getInitials } from "~/lib/utils";

const profileSchema = z.object({
  firstname: z.string().min(1, "First name is required"),
  lastname: z.string().min(1, "Last name is required"),
});

type ProfileFormValues = z.infer<typeof profileSchema>;

type AccountProfileSectionProps = {
  user: {
    image?: string | null;
    email: string;
    firstname?: string;
    lastname?: string;
    name?: string;
  };
};

export function AccountProfileSection({ user }: AccountProfileSectionProps) {
  const queryClient = useQueryClient();
  const firstname = user.firstname ?? user.name?.split(" ")[0] ?? "";
  const lastname = user.lastname ?? user.name?.split(" ").slice(1).join(" ") ?? "";

  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: { firstname, lastname },
  });

  const handleImageUpload = async (image: string) => {
    const { error } = await authClient.updateUser({ image });
    if (error) {
      toast.error(error.message ?? "Failed to update profile photo");
      return;
    }
    await queryClient.invalidateQueries({ queryKey: ["users"] });
    toast.success("Profile photo updated");
  };

  const onSubmit = async (values: ProfileFormValues) => {
    const { error } = await authClient.updateUser(values);
    if (error) {
      toast.error(error.message ?? "Failed to update profile");
      return;
    }
    toast.success("Profile updated");
  };

  return (
    <>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <PageSection title="Profile">
            <PageSectionContent>
              <AvatarUploadField
                imageUrl={user.image}
                fallback={getInitials(firstname, lastname)}
                label="Profile photo"
                onUploaded={handleImageUpload}
              />
              <div className="max-w-md space-y-4">
                <FormField
                  control={form.control}
                  name="firstname"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>First name</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="lastname"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Last name</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </PageSectionContent>
            <PageSectionFooter>
              <Button type="submit" loading={form.formState.isSubmitting}>
                Save name
              </Button>
            </PageSectionFooter>
          </PageSection>
        </form>
      </Form>

      <PageSection title="Email">
        <PageSectionContent className="space-y-2">
          <p className="text-sm text-foreground">{user.email}</p>
          <PageSectionDescription>
            Email cannot be changed here yet.
          </PageSectionDescription>
        </PageSectionContent>
      </PageSection>
    </>
  );
}
