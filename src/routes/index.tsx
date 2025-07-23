import { useUser } from "@clerk/tanstack-react-start";
import { createFileRoute, useNavigate } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  component: RouteComponent,
});

function RouteComponent() {
  const user = useUser();
  const navigate = useNavigate({ from: "/" });

  if (!user.isSignedIn) {
    navigate({ to: "/sign-in/$" });
  } else {
    navigate({ to: "/dashboard" });
  }

  return (
    <div className="flex flex-col justify-center items-center h-screen">
      Welcome to Project Y
    </div>
  );
}
