import { createFileRoute, Link } from "@tanstack/react-router";
import { useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { Github, Plus, RefreshCw, Trash2, Unplug, User } from "lucide-react";
import { PageLayout } from "~/components/PageLayout";
import {
  PageSection,
  PageSectionContent,
  PageSectionDescription,
} from "~/components/PageSection";
import { ConfirmDialog } from "~/components/ConfirmDialog";
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
  useDisconnectGitHubUserMutation,
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
import { cn } from "~/lib/utils";

const connectedBadgeClassName =
  "border-emerald-500/40 bg-emerald-100 text-emerald-950 dark:border-emerald-600/50 dark:bg-emerald-950/50 dark:text-emerald-50";

const reconnectButtonClassName =
  "border-emerald-600 bg-emerald-600 text-white hover:border-emerald-700 hover:bg-emerald-700 dark:border-emerald-600 dark:bg-emerald-700 dark:hover:border-emerald-600 dark:hover:bg-emerald-600";

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

function IntegrationRow({
  icon: Icon,
  title,
  description,
  status,
  actions,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  status: React.ReactNode;
  actions: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-4 rounded-lg border border-border/60 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex min-w-0 gap-3">
        <div className="bg-muted text-muted-foreground flex size-10 shrink-0 items-center justify-center rounded-md">
          <Icon className="size-5" />
        </div>
        <div className="min-w-0 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm font-medium">{title}</p>
            {status}
          </div>
          <p className="text-muted-foreground text-sm">{description}</p>
        </div>
      </div>
      <div className="flex shrink-0 flex-wrap gap-2 sm:justify-end">{actions}</div>
    </div>
  );
}

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
  const disconnectApp = useDisconnectGitHubMutation();
  const disconnectUser = useDisconnectGitHubUserMutation();
  const createRule = useCreateGitStatusRuleMutation();
  const deleteRule = useDeleteGitStatusRuleMutation();

  const [newPattern, setNewPattern] = useState<string>(
    DEFAULT_STATUS_RULE_PATTERNS.close
  );
  const [newStatusId, setNewStatusId] = useState("");
  const [isSyncing, setIsSyncing] = useState(false);
  const [isDisconnectingApp, setIsDisconnectingApp] = useState(false);
  const [isDisconnectingUser, setIsDisconnectingUser] = useState(false);

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

  const handleSyncRepos = async () => {
    setIsSyncing(true);
    try {
      await syncRepos();
      toast.success("Repositories synced");
    } finally {
      setIsSyncing(false);
    }
  };

  const handleDisconnectApp = async () => {
    setIsDisconnectingApp(true);
    try {
      await disconnectApp();
      toast.success("GitHub App disconnected");
    } finally {
      setIsDisconnectingApp(false);
    }
  };

  const handleDisconnectUser = async () => {
    setIsDisconnectingUser(true);
    try {
      await disconnectUser();
      toast.success("GitHub account disconnected");
    } finally {
      setIsDisconnectingUser(false);
    }
  };

  return (
    <PageLayout title="Integrations">
      <PageSection title="GitHub">
        <PageSectionContent className="space-y-4">
          <PageSectionDescription>
            Connect Git hosting and automate workflows. The GitHub App links
            repositories to your workspace; a personal account link lets you
            create branches and pull requests when the app lacks permission.
          </PageSectionDescription>

          {!installUrls.configured ? (
            <p className="text-muted-foreground text-sm">
              GitHub App is not configured. Set GITHUB_APP_* and
              GIT_TOKEN_ENCRYPTION_KEY environment variables.
            </p>
          ) : (
            <div className="space-y-3">
              <IntegrationRow
                icon={Github}
                title="GitHub App"
                description="Install on your organization or account to sync repositories, branches, and pull requests."
                status={
                  connection ? (
                    <Badge className={connectedBadgeClassName}>Connected</Badge>
                  ) : (
                    <Badge variant="outline">Not connected</Badge>
                  )
                }
                actions={
                  connection ? (
                    <>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        loading={isSyncing}
                        onClick={() => void handleSyncRepos()}
                      >
                        <RefreshCw className="size-4" />
                        Sync repositories
                      </Button>
                      <ConfirmDialog
                        title="Disconnect GitHub App?"
                        description={`This removes the ${connection.accountLogin} installation from your workspace. Linked repositories and commit status rules will stop working until you install again.`}
                        confirmText="Disconnect"
                        onConfirm={() => void handleDisconnectApp()}
                      >
                        <Button
                          type="button"
                          variant="destructive"
                          size="sm"
                          loading={isDisconnectingApp}
                        >
                          <Unplug className="size-4" />
                          Disconnect
                        </Button>
                      </ConfirmDialog>
                    </>
                  ) : (
                    <Button asChild size="sm">
                      <a href={installUrls.installUrl}>Install GitHub App</a>
                    </Button>
                  )
                }
              />

              {connection ? (
                <p className="text-muted-foreground px-1 text-xs">
                  Installed as{" "}
                  <span className="text-foreground font-medium">
                    {connection.accountLogin}
                  </span>{" "}
                  ({connection.accountType})
                </p>
              ) : null}

              <IntegrationRow
                icon={User}
                title="Personal GitHub account"
                description="Optional. Used to create branches and PRs, and to act on reviews as yourself when the app cannot."
                status={
                  !installUrls.userOAuthConfigured ? (
                    <Badge variant="outline">Not configured</Badge>
                  ) : userLink ? (
                    <Badge className={connectedBadgeClassName}>Connected</Badge>
                  ) : (
                    <Badge variant="outline">Not connected</Badge>
                  )
                }
                actions={
                  !installUrls.userOAuthConfigured ? null : userLink ? (
                    <>
                      <Button
                        asChild
                        size="sm"
                        className={reconnectButtonClassName}
                      >
                        <a href={installUrls.userOAuthUrl!}>Reconnect</a>
                      </Button>
                      <ConfirmDialog
                        title="Disconnect GitHub account?"
                        description={`This removes the link to @${userLink.providerLogin ?? "your account"}. You can connect again anytime.`}
                        confirmText="Disconnect"
                        onConfirm={() => void handleDisconnectUser()}
                      >
                        <Button
                          type="button"
                          variant="destructive"
                          size="sm"
                          loading={isDisconnectingUser}
                        >
                          <Unplug className="size-4" />
                          Disconnect
                        </Button>
                      </ConfirmDialog>
                    </>
                  ) : (
                    <Button asChild variant="outline" size="sm">
                      <a href={installUrls.userOAuthUrl!}>Connect account</a>
                    </Button>
                  )
                }
              />

              {userLink?.providerLogin ? (
                <p className="text-muted-foreground px-1 text-xs">
                  Linked as{" "}
                  <span className="text-foreground font-medium">
                    @{userLink.providerLogin}
                  </span>
                </p>
              ) : null}

              {!installUrls.userOAuthConfigured ? (
                <p className="text-muted-foreground px-1 text-xs">
                  Set GITHUB_APP_CLIENT_ID and GITHUB_APP_CLIENT_SECRET, and add
                  your callback URL in the GitHub App settings.
                </p>
              ) : null}
            </div>
          )}
        </PageSectionContent>
      </PageSection>

      {connection && (
        <PageSection title="Commit status rules">
          <PageSectionContent>
            <PageSectionDescription className="mb-4">
              Reference tasks as{" "}
              <code className="text-xs">
                {COMMIT_STATUS_RULE_CONVENTION.taskReference}
              </code>{" "}
              in commit messages (same style as GitHub issue links). Use{" "}
              <code className="text-xs">
                {COMMIT_STATUS_RULE_CONVENTION.placeholder}
              </code>{" "}
              in patterns; it becomes the project key (e.g. PY-42). Optional
              hash: <code className="text-xs">#?KEY</code> matches{" "}
              <code className="text-xs">
                {COMMIT_STATUS_RULE_CONVENTION.closeExample}
              </code>{" "}
              and <code className="text-xs">fixes PY-42</code>.
            </PageSectionDescription>
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
                    className={cn(
                      "flex items-center justify-between gap-2 rounded-md border border-border/60 px-3 py-2 text-sm"
                    )}
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
