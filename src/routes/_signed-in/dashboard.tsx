import { createFileRoute } from "@tanstack/react-router";
import { useEffect } from "react";

export const Route = createFileRoute("/_signed-in/dashboard")({
  component: RouteComponent,
});

function RouteComponent() {
  useEffect(() => {
    const appId = "676bb0d1-942d-465a-a706-4ee451177507";
    const topic = "task-update";
    const sse = new EventSource(
      `https://connect.sync.pno.dev/stream/${appId}?topic=${topic}`
    );
    sse.addEventListener("update", (event) => {
      const { payload } = JSON.parse(event.data);
      console.log("data", JSON.parse(payload));
    });

    return () => {
      sse.close();
    };
  }, []);

  return <div>Hello "/_signed-in/dashboard"!</div>;
}
