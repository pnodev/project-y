import { useForm, UseFormReturn } from "react-hook-form";
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
import {
  CreateProject,
  CreateSprint,
  Project,
  Sprint,
  UpdateProject,
  UpdateSprint,
} from "~/db/schema";
import { UploadButton } from "~/utils/uploadthing";
import {
  PageSection,
  PageSectionContent,
  PageSectionFooter,
} from "../PageSection";
import { toast } from "sonner";
import { useSprintsQuery } from "~/db/queries/sprints";
import { DatePicker } from "../ui/date-picker";
import { useEffect, useState } from "react";
import { Alert, AlertDescription } from "../ui/alert";
import { Clock10 } from "lucide-react";

const calculateDuration = (start: Date, end: Date) => {
  const oneDay = 1000 * 60 * 60 * 24; // milliseconds in a day

  // Create new Date objects for each date, setting their time to midnight UTC.
  // This ensures we only compare the date portion and handle timezones/DST robustly.
  const utcStart = Date.UTC(
    start.getFullYear(),
    start.getMonth(),
    start.getDate()
  );
  const utcEnd = Date.UTC(end.getFullYear(), end.getMonth(), end.getDate());

  // Calculate the absolute difference in milliseconds
  const differenceMs = Math.abs(utcStart - utcEnd);

  // Convert to days and round to the nearest whole number.
  // Since we've normalized to midnight, this will give the correct calendar day difference.
  return Math.round(differenceMs / oneDay);
};

export function SprintFormCreate({
  onSubmit,
}: {
  onSubmit: (data: CreateSprint) => void;
}) {
  const sprintsQuery = useSprintsQuery();
  const formSchema = z.object({
    name: z.string().min(1, "Sprint name is required").max(256),
    start: z.date(),
    end: z.date(),
  }) satisfies z.ZodType<CreateSprint>;
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: `Sprint ${sprintsQuery.data?.length + 1}`,
      start: new Date(),
      // add 2 weeks to the current date
      end: new Date(new Date().getTime() + 2 * 7 * 24 * 60 * 60 * 1000),
    },
  });

  const [duration, setDuration] = useState(() =>
    calculateDuration(form.getValues("start"), form.getValues("end"))
  );

  const handleSubmit = (data: CreateSprint) => {
    onSubmit(data);
    form.reset(); // Reset the form after submission
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-8">
        <PageSection title="Sprint Details">
          <PageSectionContent className="space-y-8">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Sprint Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Sprint Name" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="start"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel htmlFor="start-date">Start Date</FormLabel>
                    <FormControl>
                      <DatePicker
                        id="start-date"
                        {...field}
                        onChange={(value) => {
                          // set time to 00:00:00 before setting the new value
                          const newStart = new Date(value);
                          newStart.setHours(0, 0, 0);
                          field.onChange(newStart);
                          setDuration(
                            calculateDuration(
                              form.getValues("start"),
                              form.getValues("end")
                            )
                          );
                        }}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="end"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel htmlFor="end-date">End Date</FormLabel>
                    <FormControl>
                      <DatePicker
                        id="end-date"
                        {...field}
                        onChange={(value) => {
                          // set time to 23:59:59 before setting the new value
                          const newEnd = new Date(value);
                          newEnd.setHours(23, 59, 59);
                          field.onChange(newEnd);
                          setDuration(
                            calculateDuration(
                              form.getValues("start"),
                              form.getValues("end")
                            )
                          );
                        }}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <Alert variant={"info"}>
              <Clock10 />
              <AlertDescription>
                Sprint duration: {duration} day{duration !== 1 ? "s" : ""}
              </AlertDescription>
            </Alert>
          </PageSectionContent>

          <PageSectionFooter>
            <Button loading={form.formState.isSubmitting} type="submit">
              Create Sprint
            </Button>
          </PageSectionFooter>
        </PageSection>
      </form>
    </Form>
  );
}

export function SprintFormEdit({
  sprint,
  onSubmit,
}: {
  sprint: Sprint;
  onSubmit: (data: UpdateSprint) => void;
}) {
  const formSchema = z.object({
    id: z.string(),
    name: z.string().min(1, "Sprint name is required").max(256),
    start: z.date(),
    end: z.date(),
  }) satisfies z.ZodType<UpdateSprint>;
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      id: sprint.id,
      name: sprint.name,
      start: new Date(sprint.start),
      end: new Date(sprint.end),
    },
  });

  const handleSubmit = async (data: UpdateSprint) => {
    await onSubmit(data);
    toast.success("Sprint updated successfully!");
    form.reset(); // Reset the form after submission
  };

  const [duration, setDuration] = useState(() =>
    calculateDuration(form.getValues("start"), form.getValues("end"))
  );

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-8">
        <FormField
          control={form.control}
          name="id"
          render={({ field }) => (
            <input type="hidden" name="id" value={field.value} />
          )}
        />

        <PageSection title="Sprint Details">
          <PageSectionContent className="space-y-8">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Sprint Name</FormLabel>
                  <FormControl>
                    <Input placeholder="My awesome sprint" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="start"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel htmlFor="start-date">Start Date</FormLabel>
                    <FormControl>
                      <DatePicker
                        id="start-date"
                        {...field}
                        onChange={(value) => {
                          // set time to 00:00:00 before setting the new value
                          const newStart = new Date(value);
                          newStart.setHours(0, 0, 0);
                          field.onChange(newStart);
                          setDuration(
                            calculateDuration(
                              form.getValues("start"),
                              form.getValues("end")
                            )
                          );
                        }}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="end"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel htmlFor="end-date">End Date</FormLabel>
                    <FormControl>
                      <DatePicker
                        id="end-date"
                        {...field}
                        onChange={(value) => {
                          // set time to 23:59:59 before setting the new value
                          const newEnd = new Date(value);
                          newEnd.setHours(23, 59, 59);
                          field.onChange(newEnd);
                          setDuration(
                            calculateDuration(
                              form.getValues("start"),
                              form.getValues("end")
                            )
                          );
                        }}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <Alert variant={"info"}>
              <Clock10 />
              <AlertDescription>
                Sprint duration: {duration} day{duration !== 1 ? "s" : ""}
              </AlertDescription>
            </Alert>
          </PageSectionContent>

          <PageSectionFooter>
            <Button loading={form.formState.isSubmitting} type="submit">
              Update Sprint
            </Button>
          </PageSectionFooter>
        </PageSection>
      </form>
    </Form>
  );
}
