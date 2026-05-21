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
import { CreateProject, Project, UpdateProject } from "~/db/schema";
import { UploadButton } from "~/utils/uploadthing";
import { FormLayoutShell } from "~/components/FormLayoutShell";
import { FormSheetSection } from "~/components/FormSheetSection";
import {
  formSheetFooterClass,
  formSheetFormClass,
  formSheetScrollClass,
} from "~/components/ui/surface-styles";
import { cn } from "~/lib/utils";
import { toast } from "sonner";

type FormLayout = "page" | "sheet";

type ProjectFormCreateProps = {
  onSubmit: (data: CreateProject) => void | Promise<void>;
  layout?: FormLayout;
  formId?: string;
  sheetFooter?: React.ReactNode;
};

export function ProjectFormCreate({
  onSubmit,
  layout = "page",
  formId = "project-create-form",
  sheetFooter,
}: ProjectFormCreateProps) {
  const formSchema = z.object({
    name: z.string().min(1, "Project name is required").max(256),
    description: z.string().optional(),
    logo: z.string().url("Must be a valid URL").optional().or(z.literal("")),
  }) satisfies z.ZodType<CreateProject>;
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      description: "",
      logo: "",
    },
  });

  const handleSubmit = async (data: CreateProject) => {
    await onSubmit(data);
    form.reset();
  };

  const submitButton = (
    <Button loading={form.formState.isSubmitting} type="submit">
      Create Project
    </Button>
  );

  return (
    <Form {...form}>
      <form
        id={formId}
        onSubmit={form.handleSubmit(handleSubmit)}
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
            title="Project Details"
            footer={submitButton}
            contentClassName={layout === "sheet" ? "space-y-4" : "space-y-8"}
          >
            {layout === "sheet" ? (
            <>
              <FormSheetSection title="General">
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
              </FormSheetSection>
              <FormSheetSection title="Branding">
                <FormField
                  control={form.control}
                  name="logo"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Project Logo</FormLabel>
                      <FormControl>
                        <Input type="hidden" {...field} />
                      </FormControl>
                      <FormMessage />
                      {field.value ? (
                        <img src={field.value} className="h-16 w-16" alt="" />
                      ) : null}
                      <UploadButton
                        endpoint="projectLogoUploader"
                        config={{ mode: "auto" }}
                        onClientUploadComplete={(data) => {
                          const [file] = data;
                          form.setValue("logo", file.ufsUrl);
                        }}
                      />
                    </FormItem>
                  )}
                />
              </FormSheetSection>
            </>
          ) : (
            <>
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
                    <FormLabel>Project Logo</FormLabel>
                    <FormControl>
                      <Input type="hidden" {...field} />
                    </FormControl>
                    <FormMessage />
                    {field.value ? (
                      <img src={field.value} className="h-16 w-16" alt="" />
                    ) : null}
                    <UploadButton
                      endpoint="projectLogoUploader"
                      config={{ mode: "auto" }}
                      onClientUploadComplete={(data) => {
                        const [file] = data;
                        form.setValue("logo", file.ufsUrl);
                      }}
                    />
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

type ProjectFormEditProps = {
  project: Project;
  onSubmit: (data: UpdateProject) => void | Promise<void>;
  layout?: FormLayout;
  formId?: string;
  sheetFooter?: React.ReactNode;
  /** Rendered after field sections, still above the sheet footer (e.g. danger zone). */
  sheetAppend?: React.ReactNode;
};

export function ProjectFormEdit({
  project,
  onSubmit,
  layout = "page",
  formId = "project-edit-form",
  sheetFooter,
  sheetAppend,
}: ProjectFormEditProps) {
  const formSchema = z.object({
    id: z.string(),
    name: z.string().min(1, "Project name is required").max(256),
    description: z.string().optional(),
    logo: z.string().url("Must be a valid URL").optional().or(z.literal("")),
  }) satisfies z.ZodType<UpdateProject>;
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      id: project.id,
      name: project.name,
      description: project.description || "",
      logo: project.logo || "",
    },
  });

  const handleSubmit = async (data: UpdateProject) => {
    await onSubmit(data);
    toast.success("Project updated successfully!");
    form.reset(data);
  };

  const submitButton = (
    <Button loading={form.formState.isSubmitting} type="submit">
      Update Project
    </Button>
  );

  const sheetScrollEnd =
    layout === "sheet" && sheetAppend ? sheetAppend : null;

  return (
    <Form {...form}>
      <form
        id={formId}
        onSubmit={form.handleSubmit(handleSubmit)}
        className={cn(
          layout === "page" ? "space-y-8" : formSheetFormClass
        )}
      >
        <FormField
          control={form.control}
          name="id"
          render={({ field }) => (
            <input type="hidden" name="id" value={field.value} readOnly />
          )}
        />

        <div
          className={cn(
            layout === "sheet" && formSheetScrollClass
          )}
        >
          <FormLayoutShell
            layout={layout}
            title="Project Details"
            footer={submitButton}
            contentClassName={layout === "sheet" ? "space-y-4" : "space-y-8"}
          >
            {layout === "sheet" ? (
            <>
              <FormSheetSection title="General">
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
              </FormSheetSection>
              <FormSheetSection title="Branding">
                <FormField
                  control={form.control}
                  name="logo"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Project Logo</FormLabel>
                      <FormControl>
                        <Input type="hidden" {...field} />
                      </FormControl>
                      <FormMessage />
                      {field.value ? (
                        <img src={field.value} className="h-16 w-16" alt="" />
                      ) : null}
                      <UploadButton
                        endpoint="projectLogoUploader"
                        config={{ mode: "auto" }}
                        onClientUploadComplete={(data) => {
                          const [file] = data;
                          form.setValue("logo", file.ufsUrl);
                        }}
                      />
                    </FormItem>
                  )}
                />
              </FormSheetSection>
            </>
          ) : (
            <>
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
                    <FormLabel>Project Logo</FormLabel>
                    <FormControl>
                      <Input type="hidden" {...field} />
                    </FormControl>
                    <FormMessage />
                    {field.value ? (
                      <img src={field.value} className="h-16 w-16" alt="" />
                    ) : null}
                    <UploadButton
                      endpoint="projectLogoUploader"
                      config={{ mode: "auto" }}
                      onClientUploadComplete={(data) => {
                        const [file] = data;
                        form.setValue("logo", file.ufsUrl);
                      }}
                    />
                  </FormItem>
                )}
              />
            </>
          )}
        </FormLayoutShell>
          {sheetScrollEnd}
        </div>
        {layout === "sheet" && sheetFooter ? (
          <div className={cn(formSheetFooterClass, "shrink-0")}>{sheetFooter}</div>
        ) : null}
      </form>
    </Form>
  );
}
