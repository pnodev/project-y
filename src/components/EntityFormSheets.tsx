import { getRouteApi, useNavigate, useParams } from "@tanstack/react-router";
import { Suspense, useCallback, useEffect, useState } from "react";
import { ConfirmDialog } from "~/components/ConfirmDialog";
import { FormSheet } from "~/components/FormSheet";
import { FormSheetDangerZone } from "~/components/FormSheetDangerZone";
import { FormSheetFormFooter } from "~/components/FormSheetFormFooter";
import { Button } from "~/components/ui/button";
import { ProjectFormCreate, ProjectFormEdit } from "~/components/forms/ProjectForm";
import { SprintFormCreate, SprintFormEdit } from "~/components/forms/SprintForm";
import { EntityConfigCreateForm } from "~/components/forms/EntityConfigCreateForm";
import { CreateOrganizationForm } from "~/components/settings/CreateOrganizationForm";
import { useCreateLabelMutation } from "~/db/mutations/labels";
import { useCreateStatusMutation } from "~/db/mutations/statuses";
import {
  useCreateProjectMutation,
  useDeleteProjectMutation,
  useUpdateProjectMutation,
} from "~/db/mutations/projects";
import {
  useCreateSprintMutation,
  useDeleteSprintMutation,
  useUpdateSprintMutation,
} from "~/db/mutations/sprints";
import { useProjectQuery } from "~/db/queries/projects";
import { useSprintQuery } from "~/db/queries/sprints";
import type { Project } from "~/db/schema";
import type { Sprint } from "~/db/schema";
import { useOrganizations } from "~/hooks/use-organizations";

const signedInRoute = getRouteApi("/_signed-in");

function useCloseFormSheet() {
  const navigate = useNavigate();
  return () =>
    navigate({
      to: ".",
      search: (prev) => ({ ...prev, sheet: undefined }),
      replace: true,
    });
}

const SHEET_CLOSE_MS = 320;

/** Local open state so Radix can run exit animations before the URL clears. */
function useSheetOpenState(
  urlOpen: boolean,
  onClose: () => void
): [boolean, (open: boolean) => void] {
  const [open, setOpen] = useState(urlOpen);

  useEffect(() => {
    if (urlOpen) setOpen(true);
  }, [urlOpen]);

  useEffect(() => {
    if (!urlOpen) setOpen(false);
  }, [urlOpen]);

  const onOpenChange = useCallback(
    (nextOpen: boolean) => {
      if (nextOpen) {
        setOpen(true);
        return;
      }
      setOpen(false);
      window.setTimeout(onClose, SHEET_CLOSE_MS);
    },
    [onClose]
  );

  return [open, onOpenChange];
}

export function ProjectCreateSheet({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const createProject = useCreateProjectMutation();
  const formId = "project-create-form";
  const close = () => onOpenChange(false);

  return (
    <FormSheet
      open={open}
      onOpenChange={onOpenChange}
      title="Add project"
      description="Create a project to organize your tasks."
    >
      <ProjectFormCreate
        layout="sheet"
        formId={formId}
        sheetFooter={
          <FormSheetFormFooter
            onCancel={close}
            submitLabel="Create project"
            formId={formId}
          />
        }
        onSubmit={async (data) => {
          await createProject(data);
          close();
        }}
      />
    </FormSheet>
  );
}

export function ProjectEditSheet({
  open,
  onOpenChange,
  project,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  project: Project;
}) {
  const navigate = useNavigate();
  const updateProject = useUpdateProjectMutation();
  const deleteProject = useDeleteProjectMutation();
  const formId = "project-edit-form";

  return (
    <FormSheet
      open={open}
      onOpenChange={onOpenChange}
      title="Edit project"
      description="Update project details."
    >
      <ProjectFormEdit
        layout="sheet"
        formId={formId}
        project={project}
        sheetFooter={
          <FormSheetFormFooter
            onCancel={() => onOpenChange(false)}
            submitLabel="Save changes"
            formId={formId}
          />
        }
        sheetAppend={
          <FormSheetDangerZone
            description="The following actions are not reversible."
            action={
              <ConfirmDialog
                title="Confirm deletion"
                description="Are you sure you want to delete this project? This action cannot be undone."
                onConfirm={async () => {
                  await deleteProject(project.id);
                  onOpenChange(false);
                  navigate({ to: "/dashboard" });
                }}
                confirmText="Delete"
                cancelText="Cancel"
              >
                <Button variant="destructive">Delete project</Button>
              </ConfirmDialog>
            }
          />
        }
        onSubmit={async (data) => {
          await updateProject(data);
        }}
      />
    </FormSheet>
  );
}

export function SprintCreateSheet({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const createSprint = useCreateSprintMutation();
  const formId = "sprint-create-form";
  const close = () => onOpenChange(false);

  return (
    <FormSheet
      open={open}
      onOpenChange={onOpenChange}
      title="Add sprint"
      description="Create a sprint to group work in time."
    >
      <SprintFormCreate
        layout="sheet"
        formId={formId}
        sheetFooter={
          <FormSheetFormFooter
            onCancel={close}
            submitLabel="Create sprint"
            formId={formId}
          />
        }
        onSubmit={async (data) => {
          await createSprint(data);
          close();
        }}
      />
    </FormSheet>
  );
}

export function SprintEditSheet({
  open,
  onOpenChange,
  sprint,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sprint: Sprint;
}) {
  const navigate = useNavigate();
  const updateSprint = useUpdateSprintMutation();
  const deleteSprint = useDeleteSprintMutation();
  const formId = "sprint-edit-form";

  return (
    <FormSheet
      open={open}
      onOpenChange={onOpenChange}
      title="Edit sprint"
      description="Update sprint details."
    >
      <SprintFormEdit
        layout="sheet"
        formId={formId}
        sprint={sprint}
        sheetFooter={
          <FormSheetFormFooter
            onCancel={() => onOpenChange(false)}
            submitLabel="Save changes"
            formId={formId}
          />
        }
        sheetAppend={
          <FormSheetDangerZone
            description="The following actions are not reversible."
            action={
              <ConfirmDialog
                title="Confirm deletion"
                description="Are you sure you want to delete this sprint? This action cannot be undone."
                onConfirm={async () => {
                  await deleteSprint(sprint.id);
                  onOpenChange(false);
                  navigate({ to: "/dashboard" });
                }}
                confirmText="Delete"
                cancelText="Cancel"
              >
                <Button variant="destructive">Delete sprint</Button>
              </ConfirmDialog>
            }
          />
        }
        onSubmit={async (data) => {
          await updateSprint(data);
        }}
      />
    </FormSheet>
  );
}

export function LabelCreateSheet({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const createLabel = useCreateLabelMutation();
  const formId = "label-create-form";
  const close = () => onOpenChange(false);

  return (
    <FormSheet
      open={open}
      onOpenChange={onOpenChange}
      title="Add label"
      description="Create a label to categorize tasks."
    >
      <EntityConfigCreateForm
        kind="label"
        layout="sheet"
        formId={formId}
        sheetFooter={
          <FormSheetFormFooter
            onCancel={close}
            submitLabel="Create label"
            formId={formId}
          />
        }
        onSubmit={async (data) => {
          await createLabel(data);
          close();
        }}
      />
    </FormSheet>
  );
}

export function StatusCreateSheet({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const createStatus = useCreateStatusMutation();
  const formId = "status-create-form";
  const close = () => onOpenChange(false);

  return (
    <FormSheet
      open={open}
      onOpenChange={onOpenChange}
      title="Add status"
      description="Create a workflow status for your task board. Only one status can be marked as closing."
    >
      <EntityConfigCreateForm
        kind="status"
        layout="sheet"
        formId={formId}
        sheetFooter={
          <FormSheetFormFooter
            onCancel={close}
            submitLabel="Create status"
            formId={formId}
          />
        }
        onSubmit={async (data) => {
          await createStatus(data);
          close();
        }}
      />
    </FormSheet>
  );
}

export function OrganizationCreateSheet({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { loadOrganizations } = useOrganizations();
  const formId = "organization-create-form";
  const close = () => onOpenChange(false);

  return (
    <FormSheet
      open={open}
      onOpenChange={onOpenChange}
      title="Add organization"
      description="Create a team workspace for shared projects."
    >
      <CreateOrganizationForm
        layout="sheet"
        formId={formId}
        sheetFooter={
          <FormSheetFormFooter
            onCancel={close}
            submitLabel="Create organization"
            formId={formId}
          />
        }
        onSuccess={() => {
          void loadOrganizations();
          close();
        }}
      />
    </FormSheet>
  );
}

function ProjectEditSheetFromRoute({
  projectId,
  open,
  onOpenChange,
}: {
  projectId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const projectQuery = useProjectQuery(projectId);
  if (!projectQuery.data) return null;
  return (
    <ProjectEditSheet
      open={open}
      onOpenChange={onOpenChange}
      project={projectQuery.data}
    />
  );
}

function SprintEditSheetFromRoute({
  sprintId,
  open,
  onOpenChange,
}: {
  sprintId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const sprintQuery = useSprintQuery(sprintId);
  if (!sprintQuery.data) return null;
  return (
    <SprintEditSheet
      open={open}
      onOpenChange={onOpenChange}
      sprint={sprintQuery.data}
    />
  );
}

export function FormSheetsHost() {
  const { sheet } = signedInRoute.useSearch();
  const params = useParams({ strict: false });
  const projectId = params.projectId as string | undefined;
  const sprintId = params.sprintId as string | undefined;
  const closeSheet = useCloseFormSheet();

  const [projectCreateOpen, onProjectCreateOpenChange] = useSheetOpenState(
    sheet === "create-project",
    closeSheet
  );
  const [sprintCreateOpen, onSprintCreateOpenChange] = useSheetOpenState(
    sheet === "create-sprint",
    closeSheet
  );
  const [orgCreateOpen, onOrgCreateOpenChange] = useSheetOpenState(
    sheet === "create-organization",
    closeSheet
  );
  const [labelCreateOpen, onLabelCreateOpenChange] = useSheetOpenState(
    sheet === "create-label",
    closeSheet
  );
  const [statusCreateOpen, onStatusCreateOpenChange] = useSheetOpenState(
    sheet === "create-status",
    closeSheet
  );
  const [projectEditOpen, onProjectEditOpenChange] = useSheetOpenState(
    sheet === "edit-project",
    closeSheet
  );
  const [sprintEditOpen, onSprintEditOpenChange] = useSheetOpenState(
    sheet === "edit-sprint",
    closeSheet
  );

  return (
    <>
      <ProjectCreateSheet
        open={projectCreateOpen}
        onOpenChange={onProjectCreateOpenChange}
      />
      <SprintCreateSheet
        open={sprintCreateOpen}
        onOpenChange={onSprintCreateOpenChange}
      />
      <OrganizationCreateSheet
        open={orgCreateOpen}
        onOpenChange={onOrgCreateOpenChange}
      />
      <LabelCreateSheet
        open={labelCreateOpen}
        onOpenChange={onLabelCreateOpenChange}
      />
      <StatusCreateSheet
        open={statusCreateOpen}
        onOpenChange={onStatusCreateOpenChange}
      />
      {projectId ? (
        <Suspense fallback={null}>
          <ProjectEditSheetFromRoute
            projectId={projectId}
            open={projectEditOpen}
            onOpenChange={onProjectEditOpenChange}
          />
        </Suspense>
      ) : null}
      {sprintId ? (
        <Suspense fallback={null}>
          <SprintEditSheetFromRoute
            sprintId={sprintId}
            open={sprintEditOpen}
            onOpenChange={onSprintEditOpenChange}
          />
        </Suspense>
      ) : null}
    </>
  );
}
