import { SignIn } from "@clerk/tanstack-react-start";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/sign-in/$")({
  component: RouteComponent,
});

function RouteComponent() {
  return (
    <div className="h-screen flex items-center justify-center">
      <SignIn />
    </div>
  );
}
