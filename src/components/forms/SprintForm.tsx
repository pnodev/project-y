import { useState } from "react";
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
import { CreateSprint, Sprint, UpdateSprint } from "~/db/schema";
import { FormLayoutShell } from "~/components/FormLayoutShell";
import { FormSheetSection } from "~/components/FormSheetSection";
import {
  formSheetFooterClass,
  formSheetFormClass,
  formSheetScrollClass,
} from "~/components/ui/surface-styles";
import { cn } from "~/lib/utils";
import { toast } from "sonner";
import { useSprintsQuery } from "~/db/queries/sprints";
import { DatePicker } from "../ui/date-picker";
import { Alert, AlertDescription } from "../ui/alert";
import { Clock10 } from "lucide-react";

type FormLayout = "page" | "sheet";

const calculateDuration = (start: Date, end: Date) => {
  const oneDay = 1000 * 60 * 60 * 24;
  const utcStart = Date.UTC(
    start.getFullYear(),
    start.getMonth(),
    start.getDate()
  );
  const utcEnd = Date.UTC(end.getFullYear(), end.getMonth(), end.getDate());
  const differenceMs = Math.abs(utcStart - utcEnd);
  return Math.round(differenceMs / oneDay);
};

type SprintFormCreateProps = {
  onSubmit: (data: CreateSprint) => void | Promise<void>;
  layout?: FormLayout;
  formId?: string;
  sheetFooter?: React.ReactNode;
};

export function SprintFormCreate({
  onSubmit,
  layout = "page",
  formId = "sprint-create-form",
  sheetFooter,
}: SprintFormCreateProps) {
  const sprintsQuery = useSprintsQuery();
  const formSchema = z.object({
    name: z.string().min(1, "Sprint name is required").max(256),
    start: z.date(),
    end: z.date(),
  }) satisfies z.ZodType<CreateSprint>;
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: `Sprint ${(sprintsQuery.data?.length ?? 0) + 1}`,
      start: new Date(),
      end: new Date(new Date().getTime() + 2 * 7 * 24 * 60 * 60 * 1000),
    },
  });

  const [duration, setDuration] = useState(() =>
    calculateDuration(form.getValues("start"), form.getValues("end"))
  );

  const handleSubmit = async (data: CreateSprint) => {
    await onSubmit(data);
    form.reset();
  };

  const submitButton = (
    <Button loading={form.formState.isSubmitting} type="submit">
      Create Sprint
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
            title="Sprint Details"
            footer={submitButton}
            contentClassName={layout === "sheet" ? "space-y-4" : "space-y-8"}
          >
            {layout === "sheet" ? (
              <FormSheetSection title="General">
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
            </FormSheetSection>
          ) : (
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
          )}

          {layout === "sheet" ? (
            <FormSheetSection title="Schedule">
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
                            const newStart = new Date(value);
                            newStart.setHours(0, 0, 0);
                            field.onChange(newStart);
                            setDuration(
                              calculateDuration(newStart, form.getValues("end"))
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
                            const newEnd = new Date(value);
                            newEnd.setHours(23, 59, 59);
                            field.onChange(newEnd);
                            setDuration(
                              calculateDuration(form.getValues("start"), newEnd)
                            );
                          }}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <Alert variant="info">
                <Clock10 />
                <AlertDescription>
                  Sprint duration: {duration} day{duration !== 1 ? "s" : ""}
                </AlertDescription>
              </Alert>
            </FormSheetSection>
          ) : (
            <>
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
                            const newStart = new Date(value);
                            newStart.setHours(0, 0, 0);
                            field.onChange(newStart);
                            setDuration(
                              calculateDuration(newStart, form.getValues("end"))
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
                            const newEnd = new Date(value);
                            newEnd.setHours(23, 59, 59);
                            field.onChange(newEnd);
                            setDuration(
                              calculateDuration(form.getValues("start"), newEnd)
                            );
                          }}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <Alert variant="info">
                <Clock10 />
                <AlertDescription>
                  Sprint duration: {duration} day{duration !== 1 ? "s" : ""}
                </AlertDescription>
              </Alert>
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

type SprintFormEditProps = {
  sprint: Sprint;
  onSubmit: (data: UpdateSprint) => void | Promise<void>;
  layout?: FormLayout;
  formId?: string;
  sheetFooter?: React.ReactNode;
  sheetAppend?: React.ReactNode;
};

export function SprintFormEdit({
  sprint,
  onSubmit,
  layout = "page",
  formId = "sprint-edit-form",
  sheetFooter,
  sheetAppend,
}: SprintFormEditProps) {
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

  const [duration, setDuration] = useState(() =>
    calculateDuration(form.getValues("start"), form.getValues("end"))
  );

  const handleSubmit = async (data: UpdateSprint) => {
    await onSubmit(data);
    toast.success("Sprint updated successfully!");
    form.reset(data);
  };

  const submitButton = (
    <Button loading={form.formState.isSubmitting} type="submit">
      Update Sprint
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
            title="Sprint Details"
            footer={submitButton}
            contentClassName={layout === "sheet" ? "space-y-4" : "space-y-8"}
          >
            {layout === "sheet" ? (
              <FormSheetSection title="General">
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
            </FormSheetSection>
          ) : (
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
          )}

          {layout === "sheet" ? (
            <FormSheetSection title="Schedule">
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="start"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel htmlFor="edit-start-date">Start Date</FormLabel>
                      <FormControl>
                        <DatePicker
                          id="edit-start-date"
                          {...field}
                          onChange={(value) => {
                            const newStart = new Date(value);
                            newStart.setHours(0, 0, 0);
                            field.onChange(newStart);
                            setDuration(
                              calculateDuration(newStart, form.getValues("end"))
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
                      <FormLabel htmlFor="edit-end-date">End Date</FormLabel>
                      <FormControl>
                        <DatePicker
                          id="edit-end-date"
                          {...field}
                          onChange={(value) => {
                            const newEnd = new Date(value);
                            newEnd.setHours(23, 59, 59);
                            field.onChange(newEnd);
                            setDuration(
                              calculateDuration(form.getValues("start"), newEnd)
                            );
                          }}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <Alert variant="info">
                <Clock10 />
                <AlertDescription>
                  Sprint duration: {duration} day{duration !== 1 ? "s" : ""}
                </AlertDescription>
              </Alert>
            </FormSheetSection>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="start"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel htmlFor="edit-start-date">Start Date</FormLabel>
                      <FormControl>
                        <DatePicker
                          id="edit-start-date"
                          {...field}
                          onChange={(value) => {
                            const newStart = new Date(value);
                            newStart.setHours(0, 0, 0);
                            field.onChange(newStart);
                            setDuration(
                              calculateDuration(newStart, form.getValues("end"))
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
                      <FormLabel htmlFor="edit-end-date">End Date</FormLabel>
                      <FormControl>
                        <DatePicker
                      id="edit-end-date"
                      {...field}
                      onChange={(value) => {
                        const newEnd = new Date(value);
                        newEnd.setHours(23, 59, 59);
                        field.onChange(newEnd);
                        setDuration(
                          calculateDuration(form.getValues("start"), newEnd)
                        );
                      }}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          <Alert variant="info">
            <Clock10 />
            <AlertDescription>
              Sprint duration: {duration} day{duration !== 1 ? "s" : ""}
            </AlertDescription>
          </Alert>
        </>
      )}
    </FormLayoutShell>
          {layout === "sheet" && sheetAppend ? sheetAppend : null}
        </div>
        {layout === "sheet" && sheetFooter ? (
          <div className={cn(formSheetFooterClass, "shrink-0")}>{sheetFooter}</div>
        ) : null}
      </form>
    </Form>
  );
}
