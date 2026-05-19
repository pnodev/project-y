import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { authClient } from "~/lib/auth-client";

export const Route = createFileRoute("/")({
  component: RouteComponent,
});

function RouteComponent() {
  const { data: session, isPending } = authClient.useSession();
  const navigate = useNavigate({ from: "/" });

  useEffect(() => {
    if (isPending) return;

    if (!session) {
      navigate({ to: "/sign-in/$" });
    } else {
      navigate({ to: "/dashboard" });
    }
  }, [session, isPending, navigate]);

  return (
    <div className="flex flex-col justify-center items-center h-screen">
      Welcome to Project Y
    </div>
  );
}
