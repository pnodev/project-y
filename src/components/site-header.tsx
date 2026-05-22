import { ClientOnly, useNavigate } from "@tanstack/react-router";
import { Menu } from "lucide-react";
import { authClient } from "~/lib/auth-client";
import { SearchForm } from "~/components/search-form";
import { UserMenu } from "~/components/UserMenu";
import { Button } from "~/components/ui/button";
import { useSidebar } from "~/components/ui/sidebar";
import { formatUserName, getUserInitials } from "~/lib/utils";

export function SiteHeader() {
  const { toggleSidebar } = useSidebar();
  const navigate = useNavigate();
  const { data: session } = authClient.useSession();

  const handleSignOut = async () => {
    await authClient.signOut();
    navigate({ to: "/sign-in/$" });
  };

  const user = session?.user;
  const authUser = user as { firstname?: string; lastname?: string } | undefined;
  const userFirstname = authUser?.firstname;
  const userLastname = authUser?.lastname;
  const userDisplayName =
    formatUserName(userFirstname, userLastname) || user?.name;
  const userInitials = getUserInitials({
    firstname: userFirstname,
    lastname: userLastname,
    name: user?.name,
  });

  return (
    <header className="bg-background sticky top-0 z-50 flex w-full items-center border-b border-border/60">
      <div className="grid h-(--header-height) w-full grid-cols-[auto_1fr_auto] items-center gap-3 px-4">
        <Button
          className="h-8 w-8 shrink-0"
          variant="ghost"
          size="icon"
          aria-label="Toggle sidebar"
          onClick={toggleSidebar}
        >
          <Menu />
        </Button>

        <div className="flex min-w-0 justify-center px-2">
          <SearchForm className="w-full max-w-md" />
        </div>

        <div className="flex shrink-0 justify-end">
          <ClientOnly>
            <UserMenu
              displayName={userDisplayName}
              email={user?.email}
              imageUrl={user?.image}
              initials={userInitials}
              onSignOut={handleSignOut}
            />
          </ClientOnly>
        </div>
      </div>
    </header>
  );
}
