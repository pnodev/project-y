import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
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
import { Textarea } from "~/components/ui/textarea";
import { CreateProject } from "~/db/schema";
import { UploadButton } from "~/utils/uploadthing";
import { useEffect, useState } from "react";

// Create a form-specific schema based on your CreateProject type
const formSchema = z.object({
  name: z.string().min(1, "Project name is required").max(256),
  description: z.string().optional(),
  logo: z.string().url("Must be a valid URL").optional().or(z.literal("")),
}) satisfies z.ZodType<CreateProject>;

export function ProjectForm({
  onSubmit,
}: {
  onSubmit: (data: CreateProject) => void;
}) {
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      description: "",
      logo: "",
    },
  });

  const handleSubmit = (data: CreateProject) => {
    onSubmit(data);
    form.reset(); // Reset the form after submission
  };

  const [logoUrl, setLogoUrl] = useState("");

  useEffect(() => {
    if (logoUrl) {
      form.setValue("logo", logoUrl);
    }
  }, [logoUrl]);

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-8">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Project Name</FormLabel>
              <FormControl>
                <Input placeholder="My awesome project" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Description</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Project description..."
                  {...field}
                  value={field.value ?? ""}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="logo"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Logo</FormLabel>
              <FormControl>
                <Input type="hidden" {...field} />
              </FormControl>
              <FormMessage />
              {field.value ? (
                <img src={field.value} className="h-16 w-16" />
              ) : null}
              <UploadButton
                endpoint={"projectLogoUploader"}
                config={{ mode: "auto" }}
                onClientUploadComplete={(data) => {
                  const [file] = data;
                  form.setValue("logo", file.ufsUrl);
                }}
              />
            </FormItem>
          )}
        />

        <Button type="submit">Create Project</Button>
      </form>
    </Form>
  );
}
