import { createFileRoute } from "@tanstack/react-router";
import { useEffect } from "react";

export const Route = createFileRoute("/_signed-in/dashboard")({
  component: RouteComponent,
});

function RouteComponent() {
  return <div>Hello "/_signed-in/dashboard"!</div>;
}
