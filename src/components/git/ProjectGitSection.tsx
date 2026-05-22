import { useEffect, useState } from "react";
import { FormSheetSection } from "~/components/FormSheetSection";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Checkbox } from "~/components/ui/checkbox";
import { useQuery } from "@tanstack/react-query";
import {
  gitRepositoriesQueryOptions,
  useProjectGitConfigQuery,
} from "~/db/queries/git";
import { useSaveProjectGitRepositoriesMutation } from "~/db/mutations/git";
import { suggestTaskKeyPrefix } from "~/lib/git/task-key";
import { Button } from "~/components/ui/button";
import { toast } from "sonner";
import type { Project } from "~/db/schema";

export function ProjectGitSection({ project }: { project: Project }) {
  const reposQuery = useQuery(gitRepositoriesQueryOptions());
  const configQuery = useProjectGitConfigQuery(project.id);
  const save = useSaveProjectGitRepositoriesMutation();

  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [taskKeyPrefix, setTaskKeyPrefix] = useState(
    project.taskKeyPrefix ?? suggestTaskKeyPrefix(project.name)
  );

  useEffect(() => {
    if (!configQuery.data) return;
    const ids = configQuery.data.repositories.map((r) => r.repositoryId);
    setSelectedIds(ids);
    if (configQuery.data.project.taskKeyPrefix) {
      setTaskKeyPrefix(configQuery.data.project.taskKeyPrefix);
    }
  }, [configQuery.data]);

  const toggleRepo = (id: string) => {
    setSelectedIds((prev) => {
      if (prev.includes(id)) {
        return prev.filter((x) => x !== id);
      }
      if (prev.length >= 5) {
        toast.error("Maximum 5 repositories per project");
        return prev;
      }
      return [...prev, id];
    });
  };

  const handleSave = async () => {
    await save({
      projectId: project.id,
      repositoryIds: selectedIds,
      taskKeyPrefix: taskKeyPrefix.toUpperCase(),
    });
    toast.success("Repository settings saved");
  };

  if (reposQuery.isLoading) {
    return (
      <FormSheetSection title="Repositories">
        <p className="text-muted-foreground text-sm">Loading repositories…</p>
      </FormSheetSection>
    );
  }

  if (!reposQuery.data?.length) {
    return (
      <FormSheetSection title="Repositories">
        <p className="text-muted-foreground text-sm">
          Connect GitHub in{" "}
          <a href="/settings/integrations" className="underline">
            Integrations
          </a>{" "}
          and sync repositories first.
        </p>
      </FormSheetSection>
    );
  }

  return (
    <FormSheetSection title="Repositories">
      <div className="space-y-4">
        <div>
          <Label htmlFor="task-key-prefix">Task key prefix</Label>
          <Input
            id="task-key-prefix"
            value={taskKeyPrefix}
            onChange={(e) =>
              setTaskKeyPrefix(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ""))
            }
            className="mt-1 max-w-[120px] font-mono uppercase"
            maxLength={16}
          />
          <p className="text-muted-foreground mt-1 text-xs">
            Tasks will be keyed like {taskKeyPrefix || "PY"}-1, {taskKeyPrefix || "PY"}-2…
          </p>
        </div>

        <p className="text-muted-foreground text-xs">
          Link one or more repositories. When starting work on a task, you choose
          the repository unless the task is already linked to a branch.
        </p>

        <ul className="space-y-2">
          {reposQuery.data.map((repo) => (
            <li
              key={repo.id}
              className="flex items-center gap-3 rounded-md border px-3 py-2"
            >
              <Checkbox
                checked={selectedIds.includes(repo.id)}
                onCheckedChange={() => toggleRepo(repo.id)}
              />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{repo.fullName}</p>
                <p className="text-muted-foreground text-xs">
                  default: {repo.defaultBranch}
                </p>
              </div>
            </li>
          ))}
        </ul>

        <Button type="button" size="sm" onClick={handleSave}>
          Save repository links
        </Button>
      </div>
    </FormSheetSection>
  );
}
