import { createFileRoute, Link } from "@tanstack/react-router";
import { useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { Plus, Trash2 } from "lucide-react";
import { PageLayout } from "~/components/PageLayout";
import { PageSection, PageSectionContent } from "~/components/PageSection";
import { Button } from "~/components/ui/button";
import { Badge } from "~/components/ui/badge";
import {
  gitConnectionQueryOptions,
  gitStatusRulesQueryOptions,
} from "~/db/queries/git";
import { fetchGitHubInstallUrls } from "~/db/queries/git-install";
import {
  useCreateGitStatusRuleMutation,
  useDeleteGitStatusRuleMutation,
  useDisconnectGitHubMutation,
  useSyncGitRepositoriesMutation,
} from "~/db/mutations/git";
import { useStatusesQuery } from "~/db/queries/statuses";
import { Input } from "~/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { z } from "zod";
import {
  COMMIT_STATUS_RULE_CONVENTION,
  DEFAULT_STATUS_RULE_PATTERNS,
} from "~/lib/git/status-rules";

const integrationsSearchSchema = z.object({
  installed: z.enum(["1", "error"]).optional().catch(undefined),
  user: z.enum(["connected", "error"]).optional().catch(undefined),
  error: z.string().optional().catch(undefined),
});

export const Route = createFileRoute("/_signed-in/settings/integrations")({
  validateSearch: integrationsSearchSchema,
  head: () => ({
    meta: [{ title: "Integrations" }],
  }),
  loader: async ({ context }) => {
    await context.queryClient.ensureQueryData(gitConnectionQueryOptions());
    await context.queryClient.ensureQueryData(gitStatusRulesQueryOptions());
  },
  component: IntegrationsPage,
});

function IntegrationsPage() {
  const search = Route.useSearch();
  const queryClient = useQueryClient();
  const { data: connectionData } = useSuspenseQuery(gitConnectionQueryOptions());
  const { data: rules } = useSuspenseQuery(gitStatusRulesQueryOptions());
  const { data: installUrls } = useSuspenseQuery({
    queryKey: ["git", "install-urls"],
    queryFn: () => fetchGitHubInstallUrls(),
  });
  const statusesQuery = useStatusesQuery();
  const syncRepos = useSyncGitRepositoriesMutation();
  const disconnect = useDisconnectGitHubMutation();
  const createRule = useCreateGitStatusRuleMutation();
  const deleteRule = useDeleteGitStatusRuleMutation();

  const [newPattern, setNewPattern] = useState<string>(
    DEFAULT_STATUS_RULE_PATTERNS.close
  );
  const [newStatusId, setNewStatusId] = useState("");

  const connection = connectionData.connection;
  const userLink = connectionData.userLink;

  useEffect(() => {
    if (search.installed === "1") {
      toast.success("GitHub App connected");
      void queryClient.invalidateQueries({ queryKey: ["git"] });
    } else if (search.installed === "error") {
      toast.error("GitHub installation failed. Try Install again from this page.");
    }
    if (search.user === "connected") {
      toast.success("GitHub account linked");
      void queryClient.invalidateQueries({ queryKey: ["git"] });
    } else if (search.user === "error") {
      toast.error("GitHub account link failed");
    }
    if (search.error) {
      toast.error(`GitHub: ${search.error}`);
    }
  }, [
    search.installed,
    search.user,
    search.error,
    queryClient,
  ]);

  return (
    <PageLayout title="Integrations">
      <p className="text-muted-foreground mb-6 text-sm">
        Connect Git hosting and automate workflows.
      </p>
      <PageSection title="GitHub">
        <PageSectionContent>
        {!installUrls.configured ? (
          <p className="text-muted-foreground text-sm">
            GitHub App is not configured. Set GITHUB_APP_* and GIT_TOKEN_ENCRYPTION_KEY
            environment variables.
          </p>
        ) : connection ? (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="secondary">Connected</Badge>
              <span className="text-sm">
                {connection.accountLogin} ({connection.accountType})
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => syncRepos().then(() => toast.success("Repositories synced"))}
              >
                Sync repositories
              </Button>
              <Button
                type="button"
                variant="destructive"
                size="sm"
                onClick={() =>
                  disconnect().then(() => toast.success("GitHub disconnected"))
                }
              >
                Disconnect
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-muted-foreground text-sm">
              Install the GitHub App on your organization or account to link repositories,
              branches, and pull requests to tasks.
            </p>
            <Button asChild>
              <a href={installUrls.installUrl}>Install GitHub App</a>
            </Button>
          </div>
        )}

        {installUrls.configured && (
          <div className="mt-6 space-y-2 border-t pt-4">
            <h4 className="text-sm font-medium">Personal GitHub (optional)</h4>
            <p className="text-muted-foreground text-sm">
              Connect your GitHub account to create branches and PRs when the app lacks
              permission.
            </p>
            {!installUrls.userOAuthConfigured ? (
              <p className="text-muted-foreground text-sm">
                Set GITHUB_APP_CLIENT_ID and GITHUB_APP_CLIENT_SECRET, and add your
                callback URL in the GitHub App settings.
              </p>
            ) : userLink ? (
              <Badge variant="outline">Connected as @{userLink.providerLogin}</Badge>
            ) : (
              <Button asChild variant="outline" size="sm">
                <a href={installUrls.userOAuthUrl!}>Connect GitHub account</a>
              </Button>
            )}
          </div>
        )}
        </PageSectionContent>
      </PageSection>

      {connection && (
        <PageSection title="Commit status rules">
          <PageSectionContent>
          <p className="text-muted-foreground mb-4 text-sm">
            Reference tasks as{" "}
            <code className="text-xs">{COMMIT_STATUS_RULE_CONVENTION.taskReference}</code>{" "}
            in commit messages (same style as GitHub issue links). Use{" "}
            <code className="text-xs">{COMMIT_STATUS_RULE_CONVENTION.placeholder}</code> in
            patterns; it becomes the project key (e.g. PY-42). Optional hash:{" "}
            <code className="text-xs">#?KEY</code> matches{" "}
            <code className="text-xs">{COMMIT_STATUS_RULE_CONVENTION.closeExample}</code> and{" "}
            <code className="text-xs">fixes PY-42</code>.
          </p>
          <p className="text-muted-foreground mb-4 text-sm">
            Default close pattern:{" "}
            <code className="text-xs">{DEFAULT_STATUS_RULE_PATTERNS.close}</code>
          </p>
          <ul className="mb-4 space-y-2">
            {rules.map((rule) => {
              const status = statusesQuery.data?.find(
                (s) => s.id === rule.targetStatusId
              );
              return (
                <li
                  key={rule.id}
                  className="flex items-center justify-between gap-2 rounded-md border px-3 py-2 text-sm"
                >
                  <span>
                    <code className="text-xs">{rule.pattern}</code>
                    {" → "}
                    {status?.name ?? rule.targetStatusId}
                  </span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => deleteRule(rule.id)}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </li>
              );
            })}
          </ul>
          <div className="flex flex-wrap items-end gap-2">
            <div className="min-w-[200px] flex-1">
              <Input
                value={newPattern}
                onChange={(e) => setNewPattern(e.target.value)}
                placeholder="Pattern with KEY"
              />
            </div>
            <Select value={newStatusId} onValueChange={setNewStatusId}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Target status" />
              </SelectTrigger>
              <SelectContent>
                {statusesQuery.data?.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              type="button"
              size="sm"
              disabled={!newStatusId}
              onClick={() =>
                createRule({
                  pattern: newPattern,
                  targetStatusId: newStatusId,
                  priority: 0,
                }).then(() => toast.success("Rule added"))
              }
            >
              <Plus className="size-4" />
              Add rule
            </Button>
          </div>
          </PageSectionContent>
        </PageSection>
      )}

      <p className="text-muted-foreground text-sm">
        <Link to="/settings/organization" className="underline">
          Organization settings
        </Link>{" "}
        · GitLab support coming soon
      </p>
    </PageLayout>
  );
}
