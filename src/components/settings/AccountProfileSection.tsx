import { useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { AvatarUploadField } from "~/components/AvatarUploadField";
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
      <PageSection title="Profile">
        <PageSectionContent className="space-y-6">
          <AvatarUploadField
            imageUrl={user.image}
            fallback={getInitials(firstname, lastname)}
            label="Profile photo"
            onUploaded={handleImageUpload}
          />
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(onSubmit)}
              className="space-y-4 max-w-md"
            >
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
              <Button type="submit" loading={form.formState.isSubmitting}>
                Save name
              </Button>
            </form>
          </Form>
        </PageSectionContent>
      </PageSection>

      <PageSection title="Email">
        <PageSectionContent>
          <p className="text-sm text-gray-700">{user.email}</p>
          <p className="text-sm text-gray-500 mt-1">
            Email cannot be changed here yet.
          </p>
        </PageSectionContent>
      </PageSection>
    </>
  );
}
