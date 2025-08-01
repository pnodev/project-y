import { gte, lte, useLiveQuery } from "@tanstack/react-db";
import { ClientOnly, createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Button } from "~/components/ui/button";
import { taskCollection } from "~/db/collections";

export const Route = createFileRoute("/_signed-in/dashboard")({
  component: RouteComponent,
  loader: async () => {
    await taskCollection.preload();
  },
});

function RouteComponent() {
  return (
    <div>
      <ClientOnly>
        <Foo />
      </ClientOnly>
    </div>
  );
}

const Foo = () => {
  const [foo, setFoo] = useState(false);
  const { data, collection } = useLiveQuery((q) =>
    q.from({ taskCollection }).where((t) => {
      return foo
        ? gte(t.taskCollection.deadline, new Date())
        : lte(t.taskCollection.deadline, new Date());
    })
  );

  console.log(data);

  return (
    <div>
      <Button
        onClick={() => {
          setFoo((v) => !v);
        }}
      >
        {foo ? "Yes" : "No"}
      </Button>
      <pre>{JSON.stringify(data, null, 2)}</pre>
    </div>
  );
};
